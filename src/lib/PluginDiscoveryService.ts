import fs from 'fs/promises';
import path from 'path';
import { db } from './db';
import { logger } from './logger';

/**
 * PluginDiscoveryService
 * ──────────────────────
 * Scans the root plugins/ directory and synchronises the available_plugins
 * table with the plugin.json manifests found on disk.
 */
export class PluginDiscoveryService {
  private static pluginsDir = path.join(process.cwd(), 'plugins');

  /**
   * Synchronises filesystem plugins with the database.
   */
  static async syncPlugins() {
    logger.info('Starting synchronisation...');

    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      const pluginFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      const foundNames = new Set<string>();

      for (const folder of pluginFolders) {
        const pluginId = await this.processPlugin(folder);
        if (pluginId) foundNames.add(pluginId);
      }

      // Deactivate plugins missing from disk
      const rows = await db.query('SELECT name FROM available_plugins WHERE is_active = 1');
      const existingNames = rows.map((r: any) => r.name);
      const missing = existingNames.filter((name: string) => !foundNames.has(name));

      if (missing.length > 0) {
        logger.info(`Deactivating ${missing.length} missing plugins...`);
        for (const name of missing) {
          await db.prepare('UPDATE available_plugins SET is_active = 0 WHERE name = ?').run(name);
        }
      }

      logger.info('Synchronisation complete.');
    } catch (err) {
      logger.error('Error during sync:', err);
    }
  }

  /**
   * Processes a single plugin folder.
   */
  private static async processPlugin(folder: string): Promise<string | null> {
    const manifestPath = path.join(this.pluginsDir, folder, 'plugin.json');

    try {
      // Check if plugin.json exists
      await fs.access(manifestPath);
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      const pluginId = manifest.id || folder;
      const displayName = manifest.name || pluginId;
      const description = manifest.description || '';
      const category = manifest.category || 'general';
      const version = manifest.version || '1.0.0';
      const entry = manifest.entry || 'src/index.ts';

      // Upsert into available_plugins
      await db
        .prepare(
          `
        INSERT INTO available_plugins (
          name, display_name, description, category, is_active, is_official,
          manifest, entry_point_url, config_schema
        )
        VALUES ($1, $2, $3, $4, true, true, $5, $6, $7)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          is_official = true,
          manifest = EXCLUDED.manifest,
          entry_point_url = EXCLUDED.entry_point_url,
          updated_at = CURRENT_TIMESTAMP
      `
        )
        .run(
          pluginId,
          displayName,
          description,
          category,
          JSON.stringify(manifest),
          entry,
          '{}' // config_schema can be extracted from package.json or plugin.json later
        );

      logger.info(`Processed plugin: ${pluginId}`);
      return pluginId;
    } catch (err) {
      // Skip folders without plugin.json
      if ((err as any).code !== 'ENOENT') {
        logger.error(`Error processing ${folder}:`, err);
      }
      return null;
    }
  }
}
