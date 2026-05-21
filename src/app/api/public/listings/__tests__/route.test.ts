import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/public/listings');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function seedPost(
  overrides: {
    siteId?: string;
    postType?: string;
    status?: string;
    title?: string;
    metaKey?: string;
    metaValue?: string;
  } = {}
) {
  const siteId = overrides.siteId ?? 'site-pub-1';
  const postId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`INSERT OR IGNORE INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
    siteId,
    `slug-${siteId}`,
    `Site ${siteId}`
  );
  db.prepare(
    `INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    postId,
    siteId,
    overrides.postType ?? 'listing',
    overrides.title ?? 'Test Post',
    overrides.status ?? 'publish',
    now,
    now
  );
  if (overrides.metaKey) {
    db.prepare(`INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)`).run(
      postId,
      overrides.metaKey,
      overrides.metaValue ?? ''
    );
  }
  return postId;
}

describe('GET /api/public/listings', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 200 with listing posts by default', async () => {
    seedPost({ title: 'Camp A' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.listings)).toBe(true);
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('Camp A');
    expect(typeof data.total).toBe('number');
    expect(data.limit).toBe(20);
    expect(data.skip).toBe(0);
  });

  it('filters by type param', async () => {
    seedPost({ postType: 'listing', title: 'A Listing' });
    seedPost({ postType: 'page', title: 'A Page' });
    const res = await GET(makeRequest({ type: 'page' }));
    const data = await res.json();
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('A Page');
  });

  it('accepts comma-separated type param', async () => {
    seedPost({ postType: 'listing', title: 'Listing X' });
    seedPost({ postType: 'page', title: 'Page Y' });
    seedPost({ postType: 'booking', title: 'Booking Z' });
    const res = await GET(makeRequest({ type: 'listing,page' }));
    const data = await res.json();
    expect(data.listings.length).toBe(2);
  });

  it('filters by status param', async () => {
    seedPost({ status: 'publish', title: 'Live' });
    seedPost({ status: 'draft', title: 'Draft' });
    const res = await GET(makeRequest({ status: 'draft' }));
    const data = await res.json();
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('Draft');
  });

  it('searches by title via search param', async () => {
    seedPost({ title: 'Safari Lodge Kenya' });
    seedPost({ title: 'Beach Resort' });
    const res = await GET(makeRequest({ search: 'safari' }));
    const data = await res.json();
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('Safari Lodge Kenya');
  });

  it('filters by meta param', async () => {
    seedPost({ title: 'Featured', metaKey: 'is_featured', metaValue: '1' });
    seedPost({ title: 'Regular' });
    const res = await GET(
      new NextRequest('http://localhost/api/public/listings?meta[is_featured]=1')
    );
    const data = await res.json();
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('Featured');
  });

  it('restricts to siteId when siteId param is provided', async () => {
    seedPost({ siteId: 'site-a', title: 'Site A Post' });
    seedPost({ siteId: 'site-b', title: 'Site B Post' });
    const res = await GET(makeRequest({ siteId: 'site-a' }));
    const data = await res.json();
    expect(data.listings.length).toBe(1);
    expect(data.listings[0].postTitle).toBe('Site A Post');
    expect(data.listings[0].siteId).toBe('site-a');
  });

  it('returns 400 for invalid limit', async () => {
    const res = await GET(makeRequest({ limit: '0' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/limit/);
  });

  it('returns 400 for limit > 50', async () => {
    const res = await GET(makeRequest({ limit: '99' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative skip', async () => {
    const res = await GET(makeRequest({ skip: '-5' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/skip/);
  });

  it('respects limit and skip', async () => {
    for (let i = 0; i < 5; i++) seedPost({ title: `Camp ${i}` });
    const res = await GET(makeRequest({ limit: '2', skip: '1' }));
    const data = await res.json();
    expect(data.listings.length).toBe(2);
    expect(data.total).toBe(5);
  });

  it('returns empty array when nothing matches', async () => {
    const res = await GET(makeRequest({ search: 'xyznonexistent' }));
    const data = await res.json();
    expect(data.listings).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('cross-site: returns posts from multiple active sites', async () => {
    seedPost({ siteId: 'site-x', title: 'X Camp' });
    seedPost({ siteId: 'site-y', title: 'Y Camp' });
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.listings.length).toBe(2);
  });

  it('cross-site: excludes posts from inactive sites', async () => {
    seedPost({ siteId: 'site-active', title: 'Active Camp' });
    const inactiveId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 0)`).run(
      'site-dead',
      'slug-dead',
      'Dead Site'
    );
    db.prepare(
      `INSERT INTO posts (id, site_id, post_type, post_title, post_status, menu_order, created_at, updated_at)
       VALUES (?, 'site-dead', 'listing', 'Inactive Camp', 'publish', 0, ?, ?)`
    ).run(inactiveId, now, now);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.listings.every((l: any) => l.postTitle !== 'Inactive Camp')).toBe(true);
  });
});
