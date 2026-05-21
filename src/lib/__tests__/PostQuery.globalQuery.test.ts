import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../runMigrations';
import { PostQuery } from '../PostQuery';
import { PostRepository } from '../PostRepository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);

  // Two distinct sites
  db.prepare(
    "INSERT INTO sites (id, slug, name, is_active) VALUES ('s1', 'camp-alpha', 'Camp Alpha', 1)"
  ).run();
  db.prepare(
    "INSERT INTO sites (id, slug, name, is_active) VALUES ('s2', 'camp-beta', 'Camp Beta', 1)"
  ).run();
  db.prepare(
    "INSERT INTO sites (id, slug, name, is_active) VALUES ('s3', 'camp-inactive', 'Inactive', 0)"
  ).run();

  return db;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostQuery.globalQuery — cross-site aggregation', () => {
  let db: Database.Database;
  let repo: PostRepository;
  let q: PostQuery;

  beforeEach(() => {
    db = freshDb();
    repo = new PostRepository(db);
    q = new PostQuery(db);
  });
  afterEach(() => db.close());

  it('returns posts from all active sites', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Alpha Tent' });
    await repo.createPost({ siteId: 's2', postType: 'listing', postTitle: 'Beta Hut' });

    const results = await q.globalQuery({ postType: 'listing', status: 'publish' });
    expect(results).toHaveLength(2);
    const titles = results.map((p) => p.postTitle).sort();
    expect(titles).toEqual(['Alpha Tent', 'Beta Hut']);
  });

  it('excludes posts from inactive sites by default', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Active Listing' });
    await repo.createPost({
      siteId: 's3',
      postType: 'listing',
      postTitle: 'Inactive Site Listing',
    });

    const results = await q.globalQuery({ postType: 'listing', status: 'publish' });
    expect(results).toHaveLength(1);
    expect(results[0].postTitle).toBe('Active Listing');
  });

  it('includes inactive sites when activeOnly=false', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Active' });
    await repo.createPost({ siteId: 's3', postType: 'listing', postTitle: 'Inactive Site' });

    const results = await q.globalQuery({
      postType: 'listing',
      status: 'publish',
      activeOnly: false,
    });
    expect(results).toHaveLength(2);
  });

  it('site-scoped query never returns posts from other sites', () => {
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at) VALUES ('p1', 's1', 'listing', 'Alpha Only', 'publish', 0, 0, 0)"
    ).run();
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at) VALUES ('p2', 's2', 'listing', 'Beta Only', 'publish', 0, 0, 0)"
    ).run();

    const s1Results = q.query({ siteId: 's1', postType: 'listing' });
    expect(s1Results).toHaveLength(1);
    expect(s1Results[0].postTitle).toBe('Alpha Only');
    expect(s1Results[0].siteId).toBe('s1');

    const s2Results = q.query({ siteId: 's2', postType: 'listing' });
    expect(s2Results).toHaveLength(1);
    expect(s2Results[0].postTitle).toBe('Beta Only');
    expect(s2Results[0].siteId).toBe('s2');
  });

  it('filters by post type across sites', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Listing A' });
    await repo.createPost({ siteId: 's2', postType: 'booking', postTitle: 'Booking B' });

    const listings = await q.globalQuery({ postType: 'listing' });
    expect(listings).toHaveLength(1);
    expect(listings[0].postTitle).toBe('Listing A');
  });

  it('accepts array of post types', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Listing A' });
    await repo.createPost({ siteId: 's2', postType: 'page', postTitle: 'Page B' });
    await repo.createPost({ siteId: 's1', postType: 'booking', postTitle: 'Booking C' });

    const results = await q.globalQuery({ postType: ['listing', 'page'] });
    expect(results).toHaveLength(2);
    const types = results.map((p) => p.postType).sort();
    expect(types).toEqual(['listing', 'page']);
  });

  it('filters by status across sites', async () => {
    await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Published',
      postStatus: 'publish',
    });
    await repo.createPost({
      siteId: 's2',
      postType: 'listing',
      postTitle: 'Draft',
      postStatus: 'draft',
    });

    const published = await q.globalQuery({ postType: 'listing', status: 'publish' });
    expect(published).toHaveLength(1);
    expect(published[0].postTitle).toBe('Published');
  });

  it('searches title and content across sites', async () => {
    await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Safari Lodge',
      postContent: 'Amazing wildlife',
    });
    await repo.createPost({
      siteId: 's2',
      postType: 'listing',
      postTitle: 'Beach Resort',
      postContent: 'Ocean views',
    });

    const results = await q.globalQuery({ postType: 'listing', search: 'safari' });
    expect(results).toHaveLength(1);
    expect(results[0].postTitle).toBe('Safari Lodge');
  });

  it('filters by meta across sites', async () => {
    const p1 = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Featured Camp',
    });
    await repo.setMeta(p1.id, 'is_featured', '1');

    await repo.createPost({ siteId: 's2', postType: 'listing', postTitle: 'Regular Camp' });

    const results = await q.globalQuery({
      postType: 'listing',
      meta: [{ key: 'is_featured', value: '1' }],
    });
    expect(results).toHaveLength(1);
    expect(results[0].postTitle).toBe('Featured Camp');
  });

  it('returns meta attached to posts', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'With Meta',
    });
    await repo.setMeta(post.id, 'price_per_night', '150');
    await repo.setMeta(post.id, 'rating', '4.8');

    const results = await q.globalQuery({ postType: 'listing', includeMeta: true });
    expect(results[0].meta['price_per_night']).toBe('150');
    expect(results[0].meta['rating']).toBe('4.8');
  });

  it('respects limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: `Camp ${i}` });
    }

    const page1 = await q.globalQuery({ postType: 'listing', limit: 2, offset: 0 });
    const page2 = await q.globalQuery({ postType: 'listing', limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    const allIds = [...page1, ...page2].map((p) => p.id);
    expect(new Set(allIds).size).toBe(4);
  });

  it('globalCount returns correct cross-site count', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A' });
    await repo.createPost({ siteId: 's2', postType: 'listing', postTitle: 'B' });
    await repo.createPost({ siteId: 's1', postType: 'booking', postTitle: 'C' });

    const count = await q.globalCount({ postType: 'listing', status: 'publish' });
    expect(count).toBe(2);
  });

  it('globalCount excludes inactive sites', async () => {
    await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Active' });
    await repo.createPost({ siteId: 's3', postType: 'listing', postTitle: 'Inactive' });

    const count = await q.globalCount({ postType: 'listing' });
    expect(count).toBe(1);
  });
});
