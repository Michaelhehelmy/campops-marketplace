import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface MigrationResult {
  version: string;
  applied: boolean;
  skipped: boolean;
  error?: string;
}

export interface MigrationOptions {
  direction?: 'up' | 'down';
  target?: string;
}

/**
 * Runs SQL migration files from src/db/migrations/ in ascending filename order.
 * Tracks applied migrations in schema_migrations table (idempotent).
 * Only works with SQLite — PostgreSQL migrations should use a separate tool.
 *
 * Called from db.ts after the SQLite connection is established.
 */
export function runMigrations(
  sqliteDb: import('better-sqlite3').Database,
  migrationsOverride?: string,
  options?: MigrationOptions
): MigrationResult[] {
  const results: MigrationResult[] = [];

  try {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  } catch (err: any) {
    logger.error('[runMigrations] Failed to create schema_migrations table:', err.message);
    return results;
  }

  const migrationsDir = migrationsOverride ?? path.join(process.cwd(), 'src', 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.info('[runMigrations] No migrations directory found, skipping.');
    return results;
  }

  const dir = options?.direction ?? 'up';

  if (dir === 'down') {
    const applied = sqliteDb
      .prepare('SELECT version FROM schema_migrations ORDER BY applied_at DESC')
      .all() as { version: string }[];

    for (const row of applied) {
      if (options?.target && row.version <= options.target) break;

      const rollbackFile = path.join(migrationsDir, `${row.version}.rollback.sql`);
      if (!fs.existsSync(rollbackFile)) {
        logger.warn(`[runMigrations] No rollback file for ${row.version}, skipping.`);
        results.push({ version: row.version, applied: false, skipped: true });
        continue;
      }

      const sql = fs.readFileSync(rollbackFile, 'utf-8');
      try {
        sqliteDb.exec(sql);
        sqliteDb.prepare('DELETE FROM schema_migrations WHERE version = ?').run(row.version);
        logger.info(`[runMigrations] Rolled back: ${row.version}`);
        results.push({ version: row.version, applied: true, skipped: false });
      } catch (err: any) {
        logger.error(`[runMigrations] Failed to roll back ${row.version}:`, err.message);
        results.push({ version: row.version, applied: false, skipped: false, error: err.message });
        break;
      }
    }

    return results;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.rollback.sql'))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');

    const already = sqliteDb
      .prepare('SELECT version FROM schema_migrations WHERE version = ?')
      .get(version);

    if (already) {
      results.push({ version, applied: false, skipped: true });
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      const needsPerStatement = /ALTER\s+TABLE/i.test(sql);

      if (needsPerStatement) {
        const stripped = sql
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n');

        const statements = stripped
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          try {
            sqliteDb.exec(stmt + ';');
          } catch (stmtErr: any) {
            const msg: string = stmtErr.message ?? '';
            if (msg.includes('duplicate column name') || msg.includes('already exists')) {
              logger.info(`[runMigrations] Skipping duplicate column in ${version}: ${msg}`);
            } else {
              throw stmtErr;
            }
          }
        }
      } else {
        sqliteDb.exec(sql);
      }

      sqliteDb.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      logger.info(`[runMigrations] Applied: ${version}`);
      results.push({ version, applied: true, skipped: false });
    } catch (err: any) {
      logger.error(`[runMigrations] Failed to apply ${version}:`, err.message);
      results.push({ version, applied: false, skipped: false, error: err.message });
      break;
    }
  }

  return results;
}
