#!/usr/bin/env tsx
/**
 * scripts/migrate-properties-to-sites.ts
 *
 * One-time data migration: copies rows from `properties` into the new `sites`
 * table, normalising the plan field:
 *
 *   properties.plan = 'basic'          → sites.plan = 'basic'
 *   properties.plan = 'subdomain'      → sites.plan = 'premium'
 *   properties.plan = 'custom_domain'  → sites.plan = 'ultimate'
 *   properties.plan = 'ultimate'       → sites.plan = 'ultimate'
 *   anything else                      → sites.plan = 'basic'
 *
 * Idempotent: uses INSERT OR IGNORE so re-running is safe.
 *
 * Usage:
 *   npx tsx scripts/migrate-properties-to-sites.ts [--db <path>]
 *
 * Defaults to DATABASE_URL env or sinaicamps.db in CWD.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function normalisePlan(raw: string | null | undefined): string {
  switch (raw) {
    case 'premium':
    case 'subdomain':
      return 'premium';
    case 'custom_domain':
    case 'ultimate':
      return 'ultimate';
    default:
      return 'basic';
  }
}

function main() {
  const args = process.argv.slice(2);
  const dbFlagIdx = args.indexOf('--db');
  const dbPath =
    dbFlagIdx !== -1
      ? args[dbFlagIdx + 1]
      : (process.env.DATABASE_URL?.replace('file:', '') ?? 'sinaicamps.db');

  const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Database not found: ${resolvedPath}`);
    process.exit(1);
  }

  const db = new Database(resolvedPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  const sitesExists = db
    .prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='sites'")
    .get() as { c: number };

  if (sitesExists.c === 0) {
    console.error(
      "Table 'sites' does not exist. Run the migration runner first (start the server once)."
    );
    db.close();
    process.exit(1);
  }

  const props = db
    .prepare(
      'SELECT id, slug, name, plan, subdomain, custom_domain, domain_verified, owner_id, is_active, created_at FROM properties'
    )
    .all() as Array<{
    id: string;
    slug: string;
    name: string;
    plan: string | null;
    subdomain: string | null;
    custom_domain: string | null;
    domain_verified: number;
    owner_id: string | null;
    is_active: number;
    created_at: number | null;
  }>;

  if (props.length === 0) {
    console.log('No rows in properties table, nothing to migrate.');
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO sites
      (id, slug, name, plan, subdomain, custom_domain, domain_verified, owner_id, is_active, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Math.floor(Date.now() / 1000);
  let inserted = 0;
  let skipped = 0;

  const migrate = db.transaction(() => {
    for (const p of props) {
      const plan = normalisePlan(p.plan);
      const result = insert.run(
        p.id,
        p.slug,
        p.name,
        plan,
        p.subdomain,
        p.custom_domain,
        p.domain_verified ?? 0,
        p.owner_id,
        p.is_active ?? 1,
        p.created_at ?? now,
        now
      );
      if (result.changes > 0) {
        inserted++;
        console.log(`  ✓ Migrated: ${p.slug} (${p.id}) — plan: ${p.plan ?? 'null'} → ${plan}`);
      } else {
        skipped++;
        console.log(`  ↷ Skipped (already exists): ${p.slug} (${p.id})`);
      }
    }
  });

  migrate();

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  db.close();
}

main();
