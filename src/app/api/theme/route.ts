import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { ThemeRegistry } from '@/lib/ThemeRegistry';
import { ThemeLoader } from '@/lib/ThemeLoader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/theme?siteId=<id>
 * Returns the active theme record for a site, including its manifest.
 */
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const db = getSqlite();
    const theme = ThemeRegistry.getForSite(db, siteId);
    if (!theme) {
      return NextResponse.json({ theme: null });
    }

    const manifest = ThemeLoader.load(theme.id);
    return NextResponse.json({ theme, manifest });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to get theme' }, { status: 500 });
  }
}
