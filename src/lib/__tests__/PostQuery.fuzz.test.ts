/**
 * Fuzz / injection-safety tests for PostQuery.
 *
 * These tests verify that all user-supplied values (postType, status, search,
 * meta key/value, siteId) are passed as SQLite bound parameters and NEVER
 * interpolated into the SQL string. An injection payload that alters query
 * structure would cause the test DB to return different row counts or throw
 * errors — both of which are caught here.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PostQuery } from '../PostQuery';
import { db } from '../db';

const SITE_ID = 'fuzz-site-1';
const INJECT_PAYLOADS = [
  `'; DROP TABLE posts; --`,
  `" OR "1"="1`,
  `1; SELECT * FROM users--`,
  `%' OR 1=1 --`,
  `\\'; INSERT INTO users(email) VALUES('evil@evil.com'); --`,
  `<script>alert(1)</script>`,
  `'; UPDATE posts SET post_status='trash'; --`,
];

function seedSite() {
  db.prepare(`INSERT OR IGNORE INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
    SITE_ID,
    'fuzz-site',
    'Fuzz Site'
  );
}

function seedPost(postType = 'article', metaKey = 'color', metaValue = 'red') {
  const id = `post-${Math.random().toString(36).slice(2)}`;
  db.prepare(
    `INSERT INTO posts (id, site_id, post_type, post_status, post_title) VALUES (?, ?, ?, 'publish', 'Fuzz Post')`
  ).run(id, SITE_ID, postType);
  db.prepare(`INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)`).run(
    id,
    metaKey,
    metaValue
  );
  return id;
}

describe('PostQuery — SQL injection safety (fuzz)', () => {
  let q: PostQuery;

  beforeEach(() => {
    db.resetMockStore();
    seedSite();
    seedPost('article');
    q = new PostQuery(db as any);
  });

  it('does not throw or alter row count when injecting postType', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const rows = q.query({ siteId: SITE_ID, postType: payload });
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBe(0);
      }).not.toThrow();
    }
  });

  it('does not throw or alter row count when injecting status', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const rows = q.query({ siteId: SITE_ID, postType: 'article', status: payload });
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBe(0);
      }).not.toThrow();
    }
  });

  it('does not throw or corrupt data when injecting search term', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const rows = q.query({ siteId: SITE_ID, search: payload });
        expect(Array.isArray(rows)).toBe(true);
      }).not.toThrow();

      const surviving = db
        .prepare(`SELECT COUNT(*) as c FROM posts WHERE site_id = ?`)
        .get(SITE_ID) as { c: number };
      expect(surviving.c).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not throw or leak rows when injecting meta key', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const rows = q.query({
          siteId: SITE_ID,
          postType: 'article',
          meta: [{ key: payload, value: 'x' }],
        });
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBe(0);
      }).not.toThrow();
    }
  });

  it('does not throw or leak rows when injecting meta value', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const rows = q.query({
          siteId: SITE_ID,
          postType: 'article',
          meta: [{ key: 'color', value: payload }],
        });
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBe(0);
      }).not.toThrow();
    }
  });

  it('count() does not throw or return inflated count on injection', () => {
    for (const payload of INJECT_PAYLOADS) {
      expect(() => {
        const n = q.count({ siteId: SITE_ID, postType: payload });
        expect(typeof n).toBe('number');
        expect(n).toBe(0);
      }).not.toThrow();
    }
  });

  it('legitimate query still returns correct rows after fuzz attempts', () => {
    for (const payload of INJECT_PAYLOADS) {
      q.query({ siteId: SITE_ID, postType: payload });
    }
    const rows = q.query({ siteId: SITE_ID, postType: 'article', status: 'publish' });
    expect(rows.length).toBe(1);
    expect(rows[0].postTitle).toBe('Fuzz Post');
  });
});
