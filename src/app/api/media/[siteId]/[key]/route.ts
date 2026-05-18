import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media/:siteId/:key
 *
 * Resolves a media key to a stored URL and redirects to it.
 * Media keys are stored in the site branding under:
 *   settings.branding.logo.url        → key "logo"
 *   settings.branding.logo.favicon    → key "favicon"
 *   settings.branding.logo.appleTouchIcon → key "apple-touch-icon"
 *   settings.branding.images.hero     → key "hero"
 *   settings.branding.images.banner   → key "banner"
 *
 * Icon placeholders (icon-192, icon-512) fall back to the logo URL.
 * If no URL is found, returns 404.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { siteId: string; key: string } }
) {
  const { siteId, key } = params;

  if (!siteId || !key) {
    return NextResponse.json({ error: 'siteId and key are required' }, { status: 400 });
  }

  try {
    const property = (await db
      .prepare(
        'SELECT settings FROM properties WHERE (id = ? OR slug = ?) AND is_active = true LIMIT 1'
      )
      .get(siteId, siteId)) as { settings: string | null } | undefined;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const settings = parseJson(property.settings);
    const branding = settings.branding ?? {};
    const logo = branding.logo ?? {};
    const images = branding.images ?? {};

    const url = resolveKey(key, logo, images);

    if (!url) {
      return NextResponse.json({ error: `Media key "${key}" not found` }, { status: 404 });
    }

    return NextResponse.redirect(url, { status: 302 });
  } catch (err: any) {
    console.error('[Media API] Error:', err);
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

function resolveKey(
  key: string,
  logo: Record<string, any>,
  images: Record<string, any>
): string | null {
  switch (key) {
    case 'logo':
      return logo.url ?? null;
    case 'favicon':
      return logo.favicon ?? logo.url ?? null;
    case 'apple-touch-icon':
      return logo.appleTouchIcon ?? logo.url ?? null;
    case 'icon-192':
    case 'icon-512':
      return logo.url ?? null;
    case 'hero':
      return images.hero ?? null;
    case 'banner':
      return images.banner ?? images.hero ?? null;
    case 'thumbnail':
      return images.thumbnail ?? images.hero ?? null;
    default:
      return images[key] ?? null;
  }
}
