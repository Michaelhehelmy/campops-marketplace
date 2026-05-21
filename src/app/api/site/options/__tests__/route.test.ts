import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PUT } from '../route';
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

function seedSite(slug?: string) {
  const siteId = uuidv4();
  const s = slug ?? `slug-${siteId}`;
  db.prepare(`INSERT INTO sites (id, slug, name, is_active) VALUES (?, ?, ?, 1)`).run(
    siteId,
    s,
    'Test Site'
  );
  return { siteId, slug: s };
}

describe('GET /api/site/options', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await GET(req('http://localhost/api/site/options?siteId=x'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when siteId missing', async () => {
    const res = await GET(req('http://localhost/api/site/options'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown site', async () => {
    const res = await GET(req('http://localhost/api/site/options?siteId=ghost'));
    expect(res.status).toBe(404);
  });

  it('returns all options for site', async () => {
    const { siteId } = seedSite();
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'theme',
      'dark'
    );
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'lang',
      'en'
    );

    const res = await GET(req(`http://localhost/api/site/options?siteId=${siteId}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.options.theme).toBe('dark');
    expect(data.options.lang).toBe('en');
  });

  it('returns only requested keys', async () => {
    const { siteId } = seedSite();
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'theme',
      'dark'
    );
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'lang',
      'en'
    );

    const res = await GET(req(`http://localhost/api/site/options?siteId=${siteId}&keys=theme`));
    const data = await res.json();
    expect(data.options.theme).toBe('dark');
    expect(data.options.lang).toBeUndefined();
  });

  it('returns null for missing keys', async () => {
    const { siteId } = seedSite();
    const res = await GET(req(`http://localhost/api/site/options?siteId=${siteId}&keys=missing`));
    const data = await res.json();
    expect(data.options.missing).toBeNull();
  });

  it('resolves site by slug', async () => {
    const { siteId, slug } = seedSite('my-site');
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'foo',
      'bar'
    );
    const res = await GET(req(`http://localhost/api/site/options?siteId=${slug}`));
    const data = await res.json();
    expect(data.options.foo).toBe('bar');
  });
});

describe('PUT /api/site/options', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await PUT(
      req('http://localhost/api/site/options', {
        method: 'PUT',
        body: JSON.stringify({ siteId: 'x', options: {} }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when siteId missing', async () => {
    const res = await PUT(
      req('http://localhost/api/site/options', {
        method: 'PUT',
        body: JSON.stringify({ options: {} }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when options not an object', async () => {
    const { siteId } = seedSite();
    const res = await PUT(
      req('http://localhost/api/site/options', {
        method: 'PUT',
        body: JSON.stringify({ siteId, options: 'bad' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('upserts options and returns updated/deleted lists', async () => {
    const { siteId } = seedSite();
    const res = await PUT(
      req('http://localhost/api/site/options', {
        method: 'PUT',
        body: JSON.stringify({ siteId, options: { theme: 'dark', lang: 'fr' } }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toContain('theme');
    expect(data.updated).toContain('lang');

    const row = db
      .prepare('SELECT option_value FROM options WHERE site_id = ? AND option_name = ?')
      .get(siteId, 'theme') as any;
    expect(row.option_value).toBe('dark');
  });

  it('deletes options when value is null', async () => {
    const { siteId } = seedSite();
    db.prepare(`INSERT INTO options (site_id, option_name, option_value) VALUES (?, ?, ?)`).run(
      siteId,
      'to_delete',
      'old'
    );

    const res = await PUT(
      req('http://localhost/api/site/options', {
        method: 'PUT',
        body: JSON.stringify({ siteId, options: { to_delete: null } }),
      })
    );
    const data = await res.json();
    expect(data.deleted).toContain('to_delete');

    const row = db
      .prepare('SELECT id FROM options WHERE site_id = ? AND option_name = ?')
      .get(siteId, 'to_delete');
    expect(row).toBeNull();
  });
});
