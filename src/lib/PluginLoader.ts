import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { doAction, Hooks } from './hooks';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostTypeDefinition {
  name: string;
  label: string;
  labelPlural: string;
  icon?: string;
  supports?: string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entry?: string;
  uiEntry?: string;
  platformVersion?: string;
  campopsVersion?: string;
  planRequirement?: 'basic' | 'premium' | 'ultimate';
  postTypes?: PostTypeDefinition[];
  slots?: Record<string, string[]>;
  menuItems?: Array<{ id: string; label: string; path: string; order?: number }>;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
}

export interface PluginRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  planRequirement: string;
  isActive: boolean;
  manifest: PluginManifest;
}

export interface ActivePlugin {
  name: string;
  version: string;
  activatedAt: number | null;
  activatedBy: string | null;
  config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Plan ordering
// ---------------------------------------------------------------------------

const PLAN_ORDER: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };

export function planSatisfies(sitePlan: string, required: string): boolean {
  // Unknown site plan → -1 (fails all requirements)
  // Unknown required plan → 0 (defaults to basic, most permissive)
  const siteLevel = sitePlan in PLAN_ORDER ? PLAN_ORDER[sitePlan] : -1;
  const requiredLevel = required in PLAN_ORDER ? PLAN_ORDER[required] : 0;
  return siteLevel >= requiredLevel;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PlanRequirementError extends Error {
  constructor(pluginId: string, required: string, sitePlan: string) {
    super(
      `Plugin "${pluginId}" requires plan "${required}" but site is on "${sitePlan}". ` +
        `Please upgrade your plan to install this plugin.`
    );
    this.name = 'PlanRequirementError';
  }
}

export class PluginNotFoundError extends Error {
  constructor(pluginId: string) {
    super(`Plugin not found in registry: "${pluginId}"`);
    this.name = 'PluginNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// PluginLoader
// ---------------------------------------------------------------------------

/**
 * PluginLoader — discovers, registers, activates, and deactivates plugins.
 *
 * Design:
 *  - `scan()` reads all plugin.json manifests from the plugins/ directory and
 *    upserts them into the available_plugins table.
 *  - `init(db, siteId)` returns the list of active plugins for a site.
 *  - `activate(db, siteId, pluginId, actorId?)` enables a plugin for a site.
 *  - `deactivate(db, siteId, pluginId)` disables a plugin for a site.
 *  - Plan requirement is enforced in activate(); PlanRequirementError is thrown
 *    if the site plan is insufficient.
 *  - Plugins without a plugin.json are skipped with a warning.
 */
export class PluginLoader {
  private static pluginsRoot = path.join(process.cwd(), 'plugins');

  static setPluginsRoot(dir: string) {
    PluginLoader.pluginsRoot = dir;
  }

  // -------------------------------------------------------------------------
  // Manifest reading
  // -------------------------------------------------------------------------

  /**
   * Read and parse a single plugin.json. Returns null if missing or invalid.
   */
  static loadManifest(pluginId: string): PluginManifest | null {
    const manifestPath = path.join(PluginLoader.pluginsRoot, pluginId, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      logger.warn(`[PluginLoader] No plugin.json for "${pluginId}" — skipping.`);
      return null;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return raw as PluginManifest;
    } catch (err: any) {
      logger.warn(`[PluginLoader] Invalid plugin.json for "${pluginId}": ${err.message}`);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Registry sync
  // -------------------------------------------------------------------------

  /**
   * Scan the plugins/ directory and upsert each valid manifest into
   * available_plugins. Returns the list of registered manifests.
   * Called once at server startup.
   */
  static scan(db: Database.Database): PluginManifest[] {
    if (!fs.existsSync(PluginLoader.pluginsRoot)) {
      logger.info('[PluginLoader] No plugins/ directory found, skipping scan.');
      return [];
    }

    const dirs = fs
      .readdirSync(PluginLoader.pluginsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const registered: PluginManifest[] = [];

    for (const dir of dirs) {
      const manifest = PluginLoader.loadManifest(dir);
      if (!manifest) continue;

      try {
        db.prepare(
          `
           INSERT INTO available_plugins
             (id, name, display_name, description, is_official, is_active, manifest,
              version, plan_requirement, post_types, campops_version, review_status)
           VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             display_name     = excluded.display_name,
             description      = excluded.description,
             manifest         = excluded.manifest,
             version          = excluded.version,
             plan_requirement = excluded.plan_requirement,
             post_types       = excluded.post_types,
             campops_version   = excluded.campops_version,
             review_status    = excluded.review_status,
             updated_at       = unixepoch()
        `
        ).run(
          manifest.id,
          manifest.id,
          manifest.name,
          manifest.description ?? null,
          JSON.stringify(manifest),
          manifest.version,
          manifest.planRequirement ?? 'basic',
          manifest.postTypes ? JSON.stringify(manifest.postTypes) : null,
          manifest.campopsVersion ?? null,
          manifest.reviewStatus ?? 'approved'
        );
        registered.push(manifest);
        logger.info(`[PluginLoader] Registered plugin: ${manifest.id} v${manifest.version}`);
      } catch (err: any) {
        logger.error(`[PluginLoader] Failed to register plugin "${dir}": ${err.message}`);
      }
    }

    return registered;
  }

  // -------------------------------------------------------------------------
  // Site-scoped operations
  // -------------------------------------------------------------------------

  /**
   * Returns all currently active plugins for a site, with their config.
   */
  static init(db: Database.Database, siteId: string): ActivePlugin[] {
    const rows = db
      .prepare(
        `SELECT pp.plugin_name, pp.version, pp.activated_at, pp.activated_by, pp.config
         FROM property_plugins pp
         WHERE pp.property_id = ? AND pp.is_enabled = 1`
      )
      .all(siteId) as Array<{
      plugin_name: string;
      version: string | null;
      activated_at: number | null;
      activated_by: string | null;
      config: string | null;
    }>;

    return rows.map((r) => ({
      name: r.plugin_name,
      version: r.version ?? 'unknown',
      activatedAt: r.activated_at,
      activatedBy: r.activated_by,
      config: r.config ? JSON.parse(r.config) : {},
    }));
  }

  /**
   * Activate a plugin for a site.
   * Throws PlanRequirementError if the site plan is insufficient.
   * Fires core:plugin:activated action.
   */
  static async activate(
    db: Database.Database,
    siteId: string,
    pluginId: string,
    sitePlan: string = 'basic',
    actorId?: string
  ): Promise<void> {
    const row = db
      .prepare(
        'SELECT manifest, plan_requirement, review_status FROM available_plugins WHERE id = ? AND is_active = 1'
      )
      .get(pluginId) as
      | { manifest: string; plan_requirement: string; review_status: string }
      | undefined;

    if (!row) throw new PluginNotFoundError(pluginId);

    const required = row.plan_requirement ?? 'basic';
    if (!planSatisfies(sitePlan, required)) {
      throw new PlanRequirementError(pluginId, required, sitePlan);
    }

    const manifest: PluginManifest = JSON.parse(row.manifest);
    const now = Math.floor(Date.now() / 1000);

    const existing = db
      .prepare('SELECT id FROM property_plugins WHERE property_id = ? AND plugin_name = ?')
      .get(siteId, pluginId);

    if (existing) {
      db.prepare(
        `
        UPDATE property_plugins
        SET is_enabled = 1, activated_at = ?, activated_by = ?, version = ?
        WHERE property_id = ? AND plugin_name = ?
      `
      ).run(now, actorId ?? null, manifest.version, siteId, pluginId);
    } else {
      db.prepare(
        `
        INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled, activated_at, activated_by, version)
        VALUES (?, ?, ?, 1, ?, ?, ?)
      `
      ).run(`pp-${siteId}-${pluginId}`, siteId, pluginId, now, actorId ?? null, manifest.version);
    }

    await doAction(Hooks.CORE_PLUGIN_ACTIVATED, {
      siteId,
      pluginId,
      version: manifest.version,
      actorId,
    });
    logger.info(`[PluginLoader] Activated plugin "${pluginId}" for site "${siteId}"`);

    // Fire post-type registration hooks for each declared post type
    if (manifest.postTypes?.length) {
      for (const pt of manifest.postTypes) {
        await doAction(Hooks.CORE_POST_TYPE_REGISTERED, { siteId, pluginId, postType: pt });
      }
    }
  }

  /**
   * Deactivate a plugin for a site. Fires core:plugin:deactivated action.
   */
  static async deactivate(
    db: Database.Database,
    siteId: string,
    pluginId: string,
    actorId?: string
  ): Promise<void> {
    const existing = db
      .prepare('SELECT id FROM property_plugins WHERE property_id = ? AND plugin_name = ?')
      .get(siteId, pluginId);

    if (!existing) {
      logger.warn(
        `[PluginLoader] Plugin "${pluginId}" not installed for site "${siteId}" — nothing to deactivate.`
      );
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `
      UPDATE property_plugins
      SET is_enabled = 0, last_disabled_at = ?
      WHERE property_id = ? AND plugin_name = ?
    `
    ).run(now, siteId, pluginId);

    await doAction(Hooks.CORE_PLUGIN_DEACTIVATED, { siteId, pluginId, actorId });
    logger.info(`[PluginLoader] Deactivated plugin "${pluginId}" for site "${siteId}"`);
  }

  /**
   * List all available plugins from the registry, optionally filtered by plan.
   */
  static list(db: Database.Database, maxPlan?: string): PluginRecord[] {
    const rows = db
      .prepare(
        'SELECT * FROM available_plugins WHERE is_active = 1 AND review_status = ? ORDER BY name'
      )
      .all('approved') as any[];

    return rows
      .filter((r) => !maxPlan || planSatisfies(maxPlan, r.plan_requirement ?? 'basic'))
      .map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name ?? r.name,
        description: r.description ?? null,
        version: r.version ?? '0.0.0',
        planRequirement: r.plan_requirement ?? 'basic',
        isActive: Boolean(r.is_active),
        manifest: r.manifest ? JSON.parse(r.manifest) : {},
      }));
  }
}
