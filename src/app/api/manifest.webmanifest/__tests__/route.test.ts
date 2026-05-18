import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/manifest.webmanifest');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function seedProperty(
  overrides: Partial<{
    id: string;
    slug: string;
    name: string;
    plan: string;
    settings: string;
  }> = {}
) {
  const id = overrides.id ?? uuidv4();
  const slug = overrides.slug ?? `test-site-${id.slice(0, 8)}`;
  db.prepare(
    `INSERT INTO properties (id, slug, name, plan, is_active, owner_id, settings)
     VALUES (?, ?, ?, ?, 1, 'owner-1', ?)`
  ).run(
    id,
    slug,
    overrides.name ?? 'Test Camp',
    overrides.plan ?? 'basic',
    overrides.settings ??
      JSON.stringify({
        branding: {
          name: 'Test Camp Branded',
          description: 'A great camp for testing',
          colors: {
            primary: '#ff0000',
            secondary: '#00ff00',
            accent: '#0000ff',
            background: '#ffffff',
          },
          logo: { url: 'https://example.com/logo.png' },
          typography: { headingFont: 'Georgia', bodyFont: 'Arial' },
        },
      })
  );
  return { id, slug };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/manifest.webmanifest', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 400 when no siteId or slug provided', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/siteId or slug/);
  });

  it('returns 404 for unknown siteId', async () => {
    const res = await GET(makeRequest({ siteId: 'nonexistent-id' }));
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown slug', async () => {
    const res = await GET(makeRequest({ slug: 'no-such-slug' }));
    expect(res.status).toBe(404);
  });

  it('returns valid manifest JSON by siteId', async () => {
    const { id } = seedProperty();
    const res = await GET(makeRequest({ siteId: id }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/manifest+json');
    const manifest = await res.json();
    expect(manifest.name).toBe('Test Camp Branded');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#ff0000');
    expect(manifest.background_color).toBe('#ffffff');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('returns valid manifest JSON by slug', async () => {
    const { slug } = seedProperty({ slug: 'my-test-camp' });
    const res = await GET(makeRequest({ slug }));
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe('Test Camp Branded');
  });

  it('uses property name as fallback when branding.name is absent', async () => {
    const { id } = seedProperty({
      name: 'Fallback Camp',
      settings: JSON.stringify({ branding: {} }),
    });
    const res = await GET(makeRequest({ siteId: id }));
    const manifest = await res.json();
    expect(manifest.name).toBe('Fallback Camp');
  });

  it('uses default colors when branding colors are absent', async () => {
    const { id } = seedProperty({
      settings: JSON.stringify({ branding: { name: 'No-color Camp' } }),
    });
    const res = await GET(makeRequest({ siteId: id }));
    const manifest = await res.json();
    expect(manifest.theme_color).toBe('#0f172a');
  });

  it('populates icon list with logo URL when present', async () => {
    const { id } = seedProperty();
    const res = await GET(makeRequest({ siteId: id }));
    const manifest = await res.json();
    const logoIcons = manifest.icons.filter((i: any) => i.src === 'https://example.com/logo.png');
    expect(logoIcons.length).toBeGreaterThan(0);
  });

  it('falls back to /api/media/:slug/* icon paths when no logo URL set', async () => {
    const { id, slug } = seedProperty({
      slug: 'no-logo-camp',
      settings: JSON.stringify({ branding: { name: 'No Logo Camp' } }),
    });
    const res = await GET(makeRequest({ siteId: id }));
    const manifest = await res.json();
    const mediaIcon = manifest.icons.find((i: any) =>
      (i.src as string).startsWith(`/api/media/${slug}`)
    );
    expect(mediaIcon).toBeDefined();
  });

  it('short_name is truncated to 12 characters', async () => {
    const { id } = seedProperty({
      settings: JSON.stringify({ branding: { name: 'A Very Long Camp Name That Exceeds Limit' } }),
    });
    const res = await GET(makeRequest({ siteId: id }));
    const manifest = await res.json();
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });
});

// ---------------------------------------------------------------------------
// CSS variable injection helper (unit-tested directly via import)
// ---------------------------------------------------------------------------

describe('buildCssVars (CSS injection for served index.html)', () => {
  it('generates correct :root block from branding settings', async () => {
    const { buildCssVarsForTest } = await import('../../../api/tenant/serve/cssVarsHelper');
    const css = buildCssVarsForTest({
      settings: JSON.stringify({
        branding: {
          colors: { primary: '#111', secondary: '#222', accent: '#333' },
          typography: { headingFont: 'Playfair Display', bodyFont: 'Inter' },
        },
      }),
    });
    expect(css).toContain('--color-primary:#111');
    expect(css).toContain('--color-secondary:#222');
    expect(css).toContain('--color-accent:#333');
    expect(css).toContain('--font-heading:Playfair Display');
    expect(css).toContain('--font-body:Inter');
  });

  it('returns null when settings is empty', async () => {
    const { buildCssVarsForTest } = await import('../../../api/tenant/serve/cssVarsHelper');
    expect(buildCssVarsForTest({ settings: null })).toBeNull();
    expect(buildCssVarsForTest({ settings: '{}' })).toBeNull();
  });
});
