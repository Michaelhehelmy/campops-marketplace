import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../runMigrations';
import { PostRepository } from '../PostRepository';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s1', 'camp-alpha', 'Camp Alpha')").run();
  return db;
}

describe('PostRepository', () => {
  let db: Database.Database;
  let repo: PostRepository;

  beforeEach(() => {
    db = freshDb();
    repo = new PostRepository(db);
  });
  afterEach(() => db.close());

  it('createPost inserts and returns the new post', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Cosy Tent',
      meta: { price: '120', capacity: '2' },
    });
    expect(post.id).toBeTruthy();
    expect(post.postTitle).toBe('Cosy Tent');
    expect(post.postType).toBe('listing');
    expect(post.postStatus).toBe('publish');
    expect(post.meta['price']).toBe('120');
    expect(post.meta['capacity']).toBe('2');
  });

  it('updatePost modifies fields', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Old Title',
    });
    const updated = repo.updatePost(post.id, { postTitle: 'New Title', postStatus: 'draft' });
    expect(updated?.postTitle).toBe('New Title');
    expect(updated?.postStatus).toBe('draft');
  });

  it('updatePost returns null if post does not exist', () => {
    const result = repo.updatePost('nonexistent-id', { postTitle: 'x' });
    expect(result).toBeNull();
  });

  it('trashPost sets status to trash', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Trash Me',
    });
    repo.trashPost(post.id);
    const updated = repo.getById(post.id);
    expect(updated?.postStatus).toBe('trash');
  });

  it('deletePost removes post and cascades to meta', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'Delete Me',
      meta: { k: 'v' },
    });
    await repo.deletePost(post.id);
    expect(repo.getById(post.id)).toBeNull();
    expect(repo.getMeta(post.id, 'k')).toBeNull();
  });

  it('getMeta returns null for missing key', async () => {
    const post = await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A' });
    expect(repo.getMeta(post.id, 'nonexistent')).toBeNull();
  });

  it('setMeta creates and then updates', async () => {
    const post = await repo.createPost({ siteId: 's1', postType: 'listing', postTitle: 'A' });
    repo.setMeta(post.id, 'color', 'red');
    expect(repo.getMeta(post.id, 'color')).toBe('red');
    repo.setMeta(post.id, 'color', 'blue');
    expect(repo.getMeta(post.id, 'color')).toBe('blue');
  });

  it('deleteMeta removes a single key', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'A',
      meta: { a: '1', b: '2' },
    });
    repo.deleteMeta(post.id, 'a');
    expect(repo.getMeta(post.id, 'a')).toBeNull();
    expect(repo.getMeta(post.id, 'b')).toBe('2');
  });

  it('getAllMeta returns a map of all meta', async () => {
    const post = await repo.createPost({
      siteId: 's1',
      postType: 'listing',
      postTitle: 'A',
      meta: { x: '1', y: '2' },
    });
    const all = repo.getAllMeta(post.id);
    expect(all).toEqual({ x: '1', y: '2' });
  });
});
