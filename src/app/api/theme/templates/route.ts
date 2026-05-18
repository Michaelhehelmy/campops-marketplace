import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { ThemeRegistry } from '@/lib/ThemeRegistry';
import { ThemeLoader } from '@/lib/ThemeLoader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/theme/templates?siteId=<id>&postType=<type>&context=<ctx>
 * Resolves the correct template for a given site, post type, and optional context.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const postType = searchParams.get('postType');
  const context = searchParams.get('context') ?? undefined;

  if (!siteId || !postType) {
    return NextResponse.json({ error: 'siteId and postType are required' }, { status: 400 });
  }

  try {
    const db = getSqlite();
    const theme = ThemeRegistry.getForSite(db, siteId);
    if (!theme) {
      return NextResponse.json({ error: 'No active theme for this site' }, { status: 404 });
    }

    const resolved = ThemeLoader.resolveTemplate(theme.id, postType, context);
    return NextResponse.json({ resolved });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to resolve template' }, { status: 500 });
  }
}
