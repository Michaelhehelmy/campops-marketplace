import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../runMigrations';
import { PostQuery } from '../PostQuery';
import { PostRepository } from '../PostRepository';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s1', 'camp-alpha', 'Camp Alpha')").run();
  return db;
}

describe('PostQuery', () => {
  let db: Database.Database;
  let repo: PostRepository;
  let q: PostQuery;

  beforeEach(() => {
    db = freshDb();
    repo = new PostRepository(db);
    q = new PostQuery(db);
  });
  afterEach(() => db.close());

  it('returns posts filtered by postType', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Tent A' });
    repo.createPost({ siteId: 's1', postType: 'booking', postTitle: 'Booking 1' });

    const listings = q.query({ siteId: 's1', postType: 'listing' });
    expect(listings).toHaveLength(1);
    expect(listings[0].postTitle).toBe('Tent A');
  });

  it('filters by status', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Draft', postStatus: 'draft' });
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Live', postStatus: 'publish' });

    const drafts = q.query({ siteId: 's1', status: 'draft' });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].postTitle).toBe('Draft');
  });

  it('accepts array of postTypes', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'L' });
    repo.createPost({ siteId: 's1', postType: 'room', postTitle: 'R' });
    repo.createPost({ siteId: 's1', postType: 'booking', postTitle: 'B' });

    const results = q.query({ siteId: 's1', postType: ['listing', 'room'] });
    expect(results).toHaveLength(2);
  });

  it('filters by meta key/value', () => {
    const p1 = repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A', meta: { price: '100' } });
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'B', meta: { price: '200' } });

    const results = q.query({ siteId: 's1', meta: [{ key: 'price', value: '100' }] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(p1.id);
  });

  it('supports search on post_title', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Riverside Tent' });
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Mountain Lodge' });

    const results = q.query({ siteId: 's1', search: 'riverside' });
    expect(results).toHaveLength(1);
    expect(results[0].postTitle).toBe('Riverside Tent');
  });

  it('respects limit and offset', () => {
    for (let i = 0; i < 5; i++) {
      repo.createPost({ siteId: 's1', postType: 'listing', postTitle: `Post ${i}` });
    }
    const page1 = q.query({ siteId: 's1', limit: 2, offset: 0 });
    const page2 = q.query({ siteId: 's1', limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('includes meta map by default', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A', meta: { capacity: '4' } });
    const [post] = q.query({ siteId: 's1' });
    expect(post.meta['capacity']).toBe('4');
  });

  it('skips meta loading when includeMeta=false', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A', meta: { k: 'v' } });
    const [post] = q.query({ siteId: 's1', includeMeta: false });
    expect(post.meta).toEqual({});
  });

  it('queryOne returns null when no match', () => {
    const result = q.queryOne({ siteId: 's1', postSlug: 'nonexistent' });
    expect(result).toBeNull();
  });

  it('count returns correct total', () => {
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A' });
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'B' });
    repo.createPost({ siteId: 's1', postType: 'booking', postTitle: 'C' });

    expect(q.count({ siteId: 's1', postType: 'listing' })).toBe(2);
    expect(q.count({ siteId: 's1' })).toBe(3);
  });

  it('scopes results to site only', () => {
    db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s2', 'other', 'Other')").run();
    repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'Mine' });
    repo.createPost({ siteId: 's2', postType: 'listing', postTitle: 'Theirs' });

    const results = q.query({ siteId: 's1' });
    expect(results).toHaveLength(1);
    expect(results[0].postTitle).toBe('Mine');
  });
});
