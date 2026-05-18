import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { ThemeLoader, ThemeManifest } from './ThemeLoader';
import { OptionsRepository } from './OptionsRepository';
import { logger } from './logger';

export interface ThemeRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  author: string | null;
  screenshotUrl: string | null;
  themePath: string;
  planRequirement: string;
  isActive: boolean;
}

/**
 * ThemeRegistry — discovers themes from the themes/ directory and persists
 * their metadata to the available_themes DB table.
 * Provides getForSite() and activate() for per-site theme management.
 */
export class ThemeRegistry {
  private static themesRoot = path.join(process.cwd(), 'themes');

  static setThemesRoot(dir: string) {
    ThemeRegistry.themesRoot = dir;
    ThemeLoader.setThemesRoot(dir);
  }

  /**
   * Scan themes/ directory and upsert each theme's manifest into available_themes.
   * Called once on server startup.
   */
  static register(db: Database.Database): ThemeRecord[] {
    const registered: ThemeRecord[] = [];

    if (!fs.existsSync(ThemeRegistry.themesRoot)) {
      logger.info('[ThemeRegistry] No themes/ directory found, skipping registration.');
      return registered;
    }

    const dirs = fs
      .readdirSync(ThemeRegistry.themesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      const manifest = ThemeLoader.load(dir);
      if (!manifest) continue;

      const themePath = path.join(ThemeRegistry.themesRoot, dir);

      try {
        db.prepare(
          `
          INSERT INTO available_themes
            (id, name, display_name, description, version, author, screenshot_url, theme_path, plan_requirement, is_active, manifest)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(id) DO UPDATE SET
            display_name = excluded.display_name,
            description  = excluded.description,
            version      = excluded.version,
            author       = excluded.author,
            screenshot_url = excluded.screenshot_url,
            theme_path   = excluded.theme_path,
            plan_requirement = excluded.plan_requirement,
            manifest     = excluded.manifest,
            updated_at   = unixepoch()
        `
        ).run(
          manifest.id,
          manifest.name,
          manifest.displayName,
          manifest.description ?? null,
          manifest.version,
          manifest.author ?? null,
          manifest.screenshot ?? null,
          themePath,
          manifest.planRequirement,
          JSON.stringify(manifest)
        );

        registered.push({
          id: manifest.id,
          name: manifest.name,
          displayName: manifest.displayName,
          description: manifest.description ?? null,
          version: manifest.version,
          author: manifest.author ?? null,
          screenshotUrl: manifest.screenshot ?? null,
          themePath,
          planRequirement: manifest.planRequirement,
          isActive: true,
        });

        logger.info(`[ThemeRegistry] Registered theme: ${manifest.id} v${manifest.version}`);
      } catch (err: any) {
        logger.error(`[ThemeRegistry] Failed to register theme ${dir}:`, err.message);
      }
    }

    return registered;
  }

  /**
   * Get the active theme for a site. Returns null if no theme is set.
   */
  static getForSite(db: Database.Database, siteId: string): ThemeRecord | null {
    const opts = new OptionsRepository(db);
    const themeId = opts.getOption(siteId, 'active_theme');
    if (!themeId) return null;

    const row = db
      .prepare('SELECT * FROM available_themes WHERE id = ? AND is_active = 1')
      .get(themeId) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      version: row.version,
      author: row.author,
      screenshotUrl: row.screenshot_url,
      themePath: row.theme_path,
      planRequirement: row.plan_requirement,
      isActive: Boolean(row.is_active),
    };
  }

  /**
   * Activate a theme for a site. Persists to options table.
   */
  static activate(db: Database.Database, siteId: string, themeId: string): void {
    const theme = db
      .prepare('SELECT id FROM available_themes WHERE id = ? AND is_active = 1')
      .get(themeId);
    if (!theme) throw new Error(`Theme not found or inactive: ${themeId}`);

    const opts = new OptionsRepository(db);
    opts.setOption(siteId, 'active_theme', themeId, true);
    logger.info(`[ThemeRegistry] Activated theme ${themeId} for site ${siteId}`);
  }

  /**
   * List all active themes from DB.
   */
  static list(db: Database.Database): ThemeRecord[] {
    const rows = db
      .prepare('SELECT * FROM available_themes WHERE is_active = 1 ORDER BY name')
      .all() as any[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      displayName: r.display_name,
      description: r.description,
      version: r.version,
      author: r.author,
      screenshotUrl: r.screenshot_url,
      themePath: r.theme_path,
      planRequirement: r.plan_requirement,
      isActive: Boolean(r.is_active),
    }));
  }
}
