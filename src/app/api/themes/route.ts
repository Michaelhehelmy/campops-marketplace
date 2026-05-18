import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { ThemeRegistry } from '@/lib/ThemeRegistry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/themes
 * Returns a list of all active registered themes with their metadata.
 * Public — no auth required (themes are not tenant-specific data).
 */
export async function GET() {
  try {
    const db = getSqlite();
    const themes = ThemeRegistry.list(db);
    return NextResponse.json({ themes });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list themes' }, { status: 500 });
  }
}
