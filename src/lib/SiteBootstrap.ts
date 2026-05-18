import Database from 'better-sqlite3';
import { OptionsRepository } from './OptionsRepository';
import { ThemeRegistry } from './ThemeRegistry';
import { ThemeLoader } from './ThemeLoader';
import type { ThemeManifest } from './ThemeLoader';

/**
 * SiteBootstrap — loads the runtime state needed to populate a RequestContext.
 * All methods are synchronous (SQLite) and cheap enough to call on every request.
 */
export class SiteBootstrap {
  constructor(private readonly db: Database.Database) {}

  /**
   * Returns the plugin names that are enabled for a site.
   * Reads from property_plugins (legacy table) keyed on property_id.
   */
  loadActivePlugins(siteId: string): string[] {
    const rows = this.db
      .prepare('SELECT plugin_name FROM property_plugins WHERE property_id = ? AND is_enabled = 1')
      .all(siteId) as Array<{ plugin_name: string }>;
    return rows.map((r) => r.plugin_name);
  }

  /**
   * Returns all autoload=1 options for a site as a Map.
   * Falls back to an empty Map if the options table has no rows.
   */
  loadAutoloadOptions(siteId: string): Map<string, string | null> {
    const opts = new OptionsRepository(this.db);
    const record = opts.getAutoloadOptions(siteId);
    return new Map(Object.entries(record));
  }

  /**
   * Load the active theme manifest for a site, or null if none is configured.
   */
  loadTheme(siteId: string): ThemeManifest | null {
    const theme = ThemeRegistry.getForSite(this.db, siteId);
    if (!theme) return null;
    return ThemeLoader.load(theme.id);
  }
}
