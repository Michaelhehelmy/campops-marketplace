import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface MigrationResult {
  version: string;
  applied: boolean;
  skipped: boolean;
  error?: string;
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
  migrationsOverride?: string
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
      sqliteDb.exec(sql);
      sqliteDb
        .prepare('INSERT INTO schema_migrations (version) VALUES (?)')
        .run(version);
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
