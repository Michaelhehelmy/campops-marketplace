import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '../route';
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
  return new NextRequest(url, init as any);
}

function seedSiteAndPost(
  opts: {
    siteSlug?: string;
    postType?: string;
    title?: string;
    status?: string;
  } = {}
) {
  const siteId = uuidv4();
  const postId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const slug = opts.siteSlug ?? `slug-${siteId}`;
  db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
    siteId,
    slug,
    `Site ${siteId}`
  );
  db.prepare(
    `INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    postId,
    siteId,
    opts.postType ?? 'listing',
    opts.title ?? 'Test Post',
    opts.status ?? 'publish',
    now,
    now
  );
  return { siteId, siteSlug: slug, postId };
}

describe('GET /api/site/posts', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await GET(req('http://localhost/api/site/posts?siteId=x'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when siteId missing', async () => {
    const res = await GET(req('http://localhost/api/site/posts'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/siteId/);
  });

  it('returns 404 for unknown site', async () => {
    const res = await GET(req('http://localhost/api/site/posts?siteId=nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with posts and total', async () => {
    const { siteId } = seedSiteAndPost({ title: 'Camp Post' });
    const res = await GET(req(`http://localhost/api/site/posts?siteId=${siteId}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.posts)).toBe(true);
    expect(data.posts.length).toBe(1);
    expect(data.posts[0].postTitle).toBe('Camp Post');
    expect(data.total).toBe(1);
    expect(data.limit).toBe(20);
    expect(data.skip).toBe(0);
  });

  it('resolves siteId by slug', async () => {
    const { siteSlug } = seedSiteAndPost({ siteSlug: 'my-camp', title: 'Slug Camp' });
    const res = await GET(req(`http://localhost/api/site/posts?siteId=${siteSlug}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.posts[0].postTitle).toBe('Slug Camp');
  });

  it('filters by type', async () => {
    const { siteId } = seedSiteAndPost({ postType: 'listing', title: 'A Listing' });
    seedSiteAndPost({ siteSlug: undefined, postType: 'page', title: 'A Page' });
    const res = await GET(req(`http://localhost/api/site/posts?siteId=${siteId}&type=listing`));
    const data = await res.json();
    expect(data.posts.every((p: any) => p.postType === 'listing')).toBe(true);
  });

  it('respects limit and skip', async () => {
    const { siteId } = seedSiteAndPost({ title: 'Post 1' });
    const now = Math.floor(Date.now() / 1000);
    for (let i = 2; i <= 5; i++) {
      const pid = uuidv4();
      db.prepare(
        `INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at)
         VALUES (?, ?, 'listing', ?, 'publish', 0, ?, ?)`
      ).run(pid, siteId, `Post ${i}`, now, now);
    }
    const res = await GET(req(`http://localhost/api/site/posts?siteId=${siteId}&limit=2&skip=1`));
    const data = await res.json();
    expect(data.posts.length).toBe(2);
    expect(data.total).toBe(5);
  });
});

describe('POST /api/site/posts', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await POST(
      req('http://localhost/api/site/posts', {
        method: 'POST',
        body: JSON.stringify({ siteId: 'x', postType: 'listing' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when siteId missing', async () => {
    const res = await POST(
      req('http://localhost/api/site/posts', {
        method: 'POST',
        body: JSON.stringify({ postType: 'listing' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when postType missing', async () => {
    const res = await POST(
      req('http://localhost/api/site/posts', {
        method: 'POST',
        body: JSON.stringify({ siteId: 'x' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('creates post and returns 201', async () => {
    const siteId = uuidv4();
    db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
      siteId,
      `slug-${siteId}`,
      'Test Site'
    );

    const res = await POST(
      req('http://localhost/api/site/posts', {
        method: 'POST',
        body: JSON.stringify({
          siteId,
          postType: 'listing',
          postTitle: 'New Camp',
          meta: { is_featured: '1' },
        }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.post.postTitle).toBe('New Camp');
    expect(data.post.postType).toBe('listing');
    expect(data.post.meta.is_featured).toBe('1');
  });

  it('creates post with custom status', async () => {
    const siteId = uuidv4();
    db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
      siteId,
      `slug-${siteId}`,
      'Test Site'
    );

    const res = await POST(
      req('http://localhost/api/site/posts', {
        method: 'POST',
        body: JSON.stringify({
          siteId,
          postType: 'page',
          postTitle: 'Draft Page',
          postStatus: 'draft',
        }),
      })
    );
    const data = await res.json();
    expect(data.post.postStatus).toBe('draft');
  });
});
