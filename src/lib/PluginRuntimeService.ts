import path from 'path';
import fs from 'fs';
import { db } from './db';
import { makePluginAPI } from './PluginAPI';
import { logger } from './logger';
import { PluginBroker } from './PluginBroker';
import { PluginCapability } from '../../packages/plugin-sdk/src/types';
import { recordLoad, recordError, removeRecord, startWatchdog } from './plugin-watchdog';

/**
 * Reads the capabilities a plugin declares in its package.json manifest.
 * Uses a `sinaicamps.capabilities` field — omitted means all capabilities granted.
 */
function readPluginCapabilities(
  pluginDir: string,
  pluginId: string
): PluginCapability[] | undefined {
  const manifestPath = path.join(pluginDir, 'package.json');
  if (!fs.existsSync(manifestPath)) return undefined;

  try {
    const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const raw: unknown = (pkg as any).sinaicamps?.capabilities;
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    return raw.map(String) as PluginCapability[];
  } catch {
    logger.warn(`Could not parse manifest for plugin ${pluginId}, granting all capabilities`);
    return undefined;
  }
}

/**
 * PluginRuntimeService
 * ────────────────────
 * Handles discovery, loading, and initialization of plugins from the filesystem.
 */
export class PluginRuntimeService {
  private static initializedPlugins = new Set<string>();

  /**
   * Initializes all enabled plugins.
   */
  static async init(propertyId?: string) {
    try {
      // Fetch enabled plugins for this property
      let pluginsToLoad: string[] = [];
      logger.info(`Fetching plugins... propertyId: ${propertyId || 'system'}`);
      if (propertyId) {
        const rows = await db.query(
          'SELECT plugin_name FROM property_plugins WHERE property_id = ? AND is_enabled = 1',
          [propertyId]
        );
        pluginsToLoad = rows.map((r: any) => r.plugin_name);
      } else {
        // Global/System context - load all official active plugins
        const rows = await db.query(
          'SELECT name FROM available_plugins WHERE is_active = 1 AND is_official = 1'
        );
        logger.info(`available_plugins count: ${rows.length}`);
        pluginsToLoad = rows.map((r: any) => r.name);
      }

      logger.info(`Plugins to load: ${pluginsToLoad.join(', ')}`);

      for (const pluginId of pluginsToLoad) {
        logger.info(`Attempting to load plugin: ${pluginId}`);
        await this.loadPlugin(pluginId, propertyId);
      }
    } catch (err) {
      logger.error('Initialization error:', err);
    }
  }

  /**
   * Loads a single plugin by its ID.
   */
  private static async loadPlugin(pluginId: string, propertyId?: string) {
    const cacheKey = `${pluginId}:${propertyId || 'system'}`;
    if (this.initializedPlugins.has(cacheKey)) return;

    try {
      // Plugins are located in /plugins/[id]
      const pluginDir = path.join(process.cwd(), 'plugins', pluginId);
      const possibleEntries = [
        path.join(pluginDir, 'src', 'index.ts'),
        path.join(pluginDir, 'src', 'index.tsx'),
        path.join(pluginDir, 'index.ts'),
        path.join(pluginDir, 'index.js'),
      ];

      let foundPath = '';
      for (const entry of possibleEntries) {
        if (fs.existsSync(entry)) {
          foundPath = entry;
          break;
        }
      }

      if (!foundPath) {
        logger.warn(`Could not find entry point for plugin ${pluginId}`);
        return;
      }

      // Clear require cache for this plugin to avoid stale versions
      Object.keys(require.cache).forEach((key) => {
        if (key.includes(`/plugins/${pluginId}/`)) {
          delete require.cache[key];
        }
      });

      // Import the plugin using jiti for .ts support at runtime
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const createJiti = require('jiti');
      const jiti = createJiti(__filename, {
        cache: false,
        alias: {
          '@': path.join(process.cwd(), 'src'),
          '@sinaicamps/plugin-sdk': path.join(process.cwd(), 'packages/plugin-sdk/src/index.ts'),
        },
      });
      const pluginModule = jiti(foundPath);
      logger.info(`Plugin ${pluginId} module keys: ${Object.keys(pluginModule).join(', ')}`);
      const initFunc = pluginModule.default || pluginModule;

      if (typeof initFunc === 'function') {
        logger.info(`Initializing plugin: ${pluginId}`);
        const declarations = readPluginCapabilities(pluginDir, pluginId);
        const api = makePluginAPI(pluginId, propertyId, declarations);

        const initPromise = initFunc(api);
        const timeoutMs = process.env.NODE_ENV === 'test' ? 100 : 10000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Initialization timed out after ${timeoutMs / 1000}s`)),
            timeoutMs
          )
        );

        const publicApi = await Promise.race([initPromise, timeoutPromise]);

        this.initializedPlugins.add(cacheKey);
        PluginBroker.register(pluginId, publicApi ?? {});
        recordLoad(pluginId, propertyId);
        logger.info(
          `Initialized plugin: ${pluginId}${propertyId ? ` (prop:${propertyId})` : ' (system)'}`
        );
      } else {
        logger.warn(`Plugin ${pluginId} does not have a default export function`);
      }
    } catch (err: any) {
      recordError(pluginId, err.message, propertyId);
      logger.warn(`Could not load plugin ${pluginId}:`, err.message);
      if (err.stack) logger.error(err.stack);

      // Purge require cache so next attempt gets a fresh module
      Object.keys(require.cache).forEach((key) => {
        if (key.includes(`/plugins/${pluginId}/`)) {
          delete require.cache[key];
        }
      });
    }
  }

  static async initAndWatch(propertyId?: string) {
    await this.init(propertyId);
    startWatchdog();
  }

  static clearCache() {
    this.initializedPlugins.clear();
  }
}
