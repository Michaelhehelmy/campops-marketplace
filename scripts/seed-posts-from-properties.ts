/**
 * Seed posts/postmeta from existing properties table.
 *
 * Idempotent — safe to re-run (uses INSERT OR IGNORE / upsert).
 *
 * Usage: npx tsx scripts/seed-posts-from-properties.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = process.env.DATABASE_URL?.startsWith('file:')
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(process.cwd(), 'sinaicamps.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

function uuid() {
  return randomUUID();
}

// 1. Seed sites from properties
const properties = sqlite.prepare('SELECT * FROM properties WHERE is_active = 1').all() as any[];

console.log(`Found ${properties.length} active properties`);

for (const p of properties) {
  // Upsert site
  const existingSite = sqlite.prepare('SELECT id FROM sites WHERE slug = ?').get(p.slug) as any;

  const siteId = existingSite?.id || uuid();
  const now = Math.floor(Date.now() / 1000);

  if (!existingSite) {
    sqlite
      .prepare(
        `INSERT INTO sites (id, slug, name, plan, subdomain, custom_domain, domain_verified, owner_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        siteId,
        p.slug,
        p.name,
        p.plan || 'basic',
        p.subdomain || '',
        p.custom_domain || '',
        p.domain_verified ? 1 : 0,
        p.owner_id || '',
        now,
        now
      );
    console.log(`  Created site: ${p.name} (${siteId})`);
  } else {
    sqlite
      .prepare(
        `UPDATE sites SET name = ?, plan = ?, subdomain = ?, custom_domain = ?, domain_verified = ?, owner_id = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        p.name,
        p.plan || 'basic',
        p.subdomain || '',
        p.custom_domain || '',
        p.domain_verified ? 1 : 0,
        p.owner_id || '',
        now,
        siteId
      );
    console.log(`  Updated site: ${p.name} (${siteId})`);
  }

  // Upsert post
  const existingPost = sqlite
    .prepare('SELECT id FROM posts WHERE site_id = ? AND post_type = ? AND post_slug = ?')
    .get(siteId, 'listing', p.slug) as any;

  const postId = existingPost?.id || uuid();

  if (!existingPost) {
    sqlite
      .prepare(
        `INSERT INTO posts (id, site_id, post_type, post_status, post_slug, post_title, post_content, created_at, updated_at)
         VALUES (?, ?, 'listing', 'publish', ?, ?, ?, ?, ?)`
      )
      .run(postId, siteId, p.slug, p.name, p.description || '', now, now);
    console.log(`  Created post: ${p.name} (${postId})`);
  } else {
    sqlite
      .prepare(`UPDATE posts SET post_title = ?, post_content = ?, updated_at = ? WHERE id = ?`)
      .run(p.name, p.description || '', now, postId);
    console.log(`  Updated post: ${p.name} (${postId})`);
  }

  // Upsert postmeta
  const metaFields: Record<string, string | number | null> = {
    price_per_night: p.price_per_night,
    min_price_per_night: p.min_price_per_night,
    short_description: p.short_description,
    primary_image: p.primary_image,
    city: p.city,
    country: p.country,
    amenities: p.amenities,
    rating: p.rating,
    currency_code: p.currency_code || 'USD',
    is_featured: p.is_featured ? '1' : '0',
    featured_order: p.featured_order?.toString() || '0',
  };

  for (const [key, value] of Object.entries(metaFields)) {
    if (value === null || value === undefined) continue;
    sqlite
      .prepare(
        `INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)
         ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = excluded.meta_value`
      )
      .run(postId, key, String(value));
  }

  // Also store the full settings JSON as a meta field
  if (p.settings) {
    const settings = typeof p.settings === 'string' ? p.settings : JSON.stringify(p.settings);
    sqlite
      .prepare(
        `INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, 'settings', ?)
         ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = excluded.meta_value`
      )
      .run(postId, settings);
  }

  // Store branding
  if (p.branding) {
    const branding = typeof p.branding === 'string' ? p.branding : JSON.stringify(p.branding);
    sqlite
      .prepare(
        `INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, 'branding', ?)
         ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = excluded.meta_value`
      )
      .run(postId, branding);
  }

  console.log(
    `  Seeded ${Object.keys(metaFields).filter((k) => metaFields[k] !== null).length} meta fields for ${p.name}`
  );
}

const postCount = sqlite.prepare('SELECT COUNT(*) as c FROM posts').get() as any;
const metaCount = sqlite.prepare('SELECT COUNT(*) as c FROM postmeta').get() as any;
const siteCount = sqlite.prepare('SELECT COUNT(*) as c FROM sites').get() as any;

console.log(`\nDone: ${siteCount.c} sites, ${postCount.c} posts, ${metaCount.c} postmeta rows.`);

sqlite.close();
