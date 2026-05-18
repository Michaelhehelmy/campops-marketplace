import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyFilters, Hooks } from '@/lib/hooks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/manifest.webmanifest?siteId=<id>
 *      /api/manifest.webmanifest?slug=<slug>
 *
 * Returns a per-tenant PWA web manifest built from the site's branding options.
 * Plugins may extend the manifest via the core:manifest:build filter.
 */
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const slug = req.nextUrl.searchParams.get('slug');

  if (!siteId && !slug) {
    return NextResponse.json(
      { error: 'siteId or slug query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const property = (
      siteId
        ? await db
            .prepare(
              'SELECT id, name, slug, settings, plan FROM properties WHERE id = ? AND is_active = true LIMIT 1'
            )
            .get(siteId)
        : await db
            .prepare(
              'SELECT id, name, slug, settings, plan FROM properties WHERE slug = ? AND is_active = true LIMIT 1'
            )
            .get(slug!)
    ) as
      | { id: string; name: string; slug: string; settings: string | null; plan: string }
      | undefined;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const settings = parseJson(property.settings);
    const branding = settings.branding ?? {};
    const colors = branding.colors ?? {};
    const logo = branding.logo ?? {};

    const manifest: Record<string, any> = {
      name: branding.name ?? property.name,
      short_name: (branding.name ?? property.name).slice(0, 12),
      description: branding.description ?? branding.shortDescription ?? '',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: colors.primary ?? '#0f172a',
      background_color: colors.background ?? '#ffffff',
      icons: buildIconList(logo, property.slug),
      screenshots: [],
      categories: ['travel', 'hospitality'],
      lang: 'en',
      scope: '/',
    };

    const finalManifest = await applyFilters(Hooks.CORE_MANIFEST_BUILD, manifest, {
      siteId: property.id,
    });

    return new NextResponse(JSON.stringify(finalManifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (err: any) {
    console.error('[Manifest API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value as Record<string, any>;
}

function buildIconList(
  logo: { url?: string; favicon?: string; appleTouchIcon?: string },
  slug: string
): Array<{ src: string; sizes: string; type: string; purpose?: string }> {
  const mediaBase = `/api/media/${slug}`;
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = [];

  if (logo.favicon) {
    icons.push({ src: logo.favicon, sizes: '32x32', type: 'image/png' });
  } else {
    icons.push({ src: `${mediaBase}/favicon`, sizes: '32x32', type: 'image/png' });
  }

  if (logo.appleTouchIcon) {
    icons.push({ src: logo.appleTouchIcon, sizes: '180x180', type: 'image/png' });
  } else {
    icons.push({ src: `${mediaBase}/apple-touch-icon`, sizes: '180x180', type: 'image/png' });
  }

  if (logo.url) {
    icons.push({ src: logo.url, sizes: '192x192', type: 'image/png', purpose: 'any maskable' });
    icons.push({ src: logo.url, sizes: '512x512', type: 'image/png', purpose: 'any maskable' });
  } else {
    icons.push({
      src: `${mediaBase}/icon-192`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    });
    icons.push({
      src: `${mediaBase}/icon-512`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    });
  }

  return icons;
}
