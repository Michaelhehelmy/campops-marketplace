import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PUT, DELETE } from '../route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'user-test', role: 'manager' },
      }),
    },
  },
}));

function req(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

function ctx(postId: string) {
  return { params: { postId } };
}

function seedPost(overrides: { title?: string; status?: string } = {}) {
  const siteId = uuidv4();
  const postId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
    siteId,
    `slug-${siteId}`,
    'Test Site'
  );
  db.prepare(
    `INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at)
     VALUES (?, ?, 'listing', ?, ?, 0, ?, ?)`
  ).run(postId, siteId, overrides.title ?? 'Test Post', overrides.status ?? 'publish', now, now);
  return { siteId, postId };
}

describe('GET /api/site/posts/[postId]', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await GET(req('http://localhost/api/site/posts/x'), ctx('x'));
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown post', async () => {
    const res = await GET(req('http://localhost/api/site/posts/bad-id'), ctx('bad-id'));
    expect(res.status).toBe(404);
  });

  it('returns post with meta', async () => {
    const { postId } = seedPost({ title: 'My Post' });
    db.prepare(
      `INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, 'color', 'green')`
    ).run(postId);
    const res = await GET(req(`http://localhost/api/site/posts/${postId}`), ctx(postId));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post.postTitle).toBe('My Post');
    expect(data.post.meta.color).toBe('green');
  });
});

describe('PUT /api/site/posts/[postId]', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 404 for missing post', async () => {
    const res = await PUT(
      req('http://localhost/api/site/posts/nope', {
        method: 'PUT',
        body: JSON.stringify({ postTitle: 'New' }),
      }),
      ctx('nope')
    );
    expect(res.status).toBe(404);
  });

  it('updates title', async () => {
    const { postId } = seedPost({ title: 'Old Title' });
    const res = await PUT(
      req(`http://localhost/api/site/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ postTitle: 'New Title' }),
      }),
      ctx(postId)
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post.postTitle).toBe('New Title');
  });

  it('upserts meta values', async () => {
    const { postId } = seedPost();
    const res = await PUT(
      req(`http://localhost/api/site/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ meta: { price: '200', color: 'blue' } }),
      }),
      ctx(postId)
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post.meta.price).toBe('200');
    expect(data.post.meta.color).toBe('blue');
  });

  it('deletes meta key when value is null', async () => {
    const { postId } = seedPost();
    db.prepare(
      `INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, 'old_key', 'val')`
    ).run(postId);
    const res = await PUT(
      req(`http://localhost/api/site/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ meta: { old_key: null } }),
      }),
      ctx(postId)
    );
    const data = await res.json();
    expect(data.post.meta.old_key).toBeUndefined();
  });
});

describe('DELETE /api/site/posts/[postId]', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 404 for missing post', async () => {
    const res = await DELETE(req('http://localhost/api/site/posts/nope'), ctx('nope'));
    expect(res.status).toBe(404);
  });

  it('soft-trashes post by default', async () => {
    const { postId } = seedPost();
    const res = await DELETE(req(`http://localhost/api/site/posts/${postId}`), ctx(postId));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.trashed).toBe(true);
    const row = db.prepare('SELECT post_status FROM posts WHERE id = ?').get(postId) as any;
    expect(row.post_status).toBe('trash');
  });

  it('hard-deletes post when hard=1', async () => {
    const { postId } = seedPost();
    const res = await DELETE(req(`http://localhost/api/site/posts/${postId}?hard=1`), ctx(postId));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);
    const row = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    expect(row).toBeNull();
  });
});
