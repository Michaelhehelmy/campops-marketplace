import Database from 'better-sqlite3';

/**
 * OptionsRepository — per-site key/value store backed by the `options` table.
 * Equivalent to WordPress get_option / update_option / delete_option.
 */
export class OptionsRepository {
  constructor(private readonly db: Database.Database) {}

  getOption(siteId: string, name: string): string | null {
    const row = this.db
      .prepare('SELECT option_value FROM options WHERE site_id = ? AND option_name = ? LIMIT 1')
      .get(siteId, name) as { option_value: string | null } | undefined;
    return row?.option_value ?? null;
  }

  setOption(siteId: string, name: string, value: string | null, autoload = false): void {
    const existing = this.db
      .prepare('SELECT id FROM options WHERE site_id = ? AND option_name = ? LIMIT 1')
      .get(siteId, name) as { id: number } | undefined;

    if (existing) {
      this.db
        .prepare('UPDATE options SET option_value = ?, autoload = ? WHERE site_id = ? AND option_name = ?')
        .run(value, autoload ? 1 : 0, siteId, name);
    } else {
      this.db
        .prepare(
          'INSERT INTO options (site_id, option_name, option_value, autoload) VALUES (?, ?, ?, ?)'
        )
        .run(siteId, name, value, autoload ? 1 : 0);
    }
  }

  deleteOption(siteId: string, name: string): void {
    this.db.prepare('DELETE FROM options WHERE site_id = ? AND option_name = ?').run(siteId, name);
  }

  /** Returns all autoload=1 options for a site — used on app bootstrap. */
  getAutoloadOptions(siteId: string): Record<string, string | null> {
    const rows = this.db
      .prepare('SELECT option_name, option_value FROM options WHERE site_id = ? AND autoload = 1')
      .all(siteId) as Array<{ option_name: string; option_value: string | null }>;
    const result: Record<string, string | null> = {};
    for (const r of rows) result[r.option_name] = r.option_value;
    return result;
  }

  /** Returns all options for a site (no autoload filter). */
  getAllOptions(siteId: string): Record<string, string | null> {
    const rows = this.db
      .prepare('SELECT option_name, option_value FROM options WHERE site_id = ?')
      .all(siteId) as Array<{ option_name: string; option_value: string | null }>;
    const result: Record<string, string | null> = {};
    for (const r of rows) result[r.option_name] = r.option_value;
    return result;
  }
}
