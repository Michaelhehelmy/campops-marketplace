import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { PluginLoader } from '@/lib/PluginLoader';
import { requireSession, isErrorResponse } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/site/plugins?siteId=<id>&plan=<plan>
 * Returns all available plugins (approved, active), filtered to those
 * accessible by the site's plan. Also returns which ones are installed.
 */
export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (isErrorResponse(session)) return session;
  const siteId = req.nextUrl.searchParams.get('siteId');
  const plan = req.nextUrl.searchParams.get('plan') ?? 'basic';

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const db = getSqlite();
    const available = PluginLoader.list(db, plan);
    const active = PluginLoader.init(db, siteId);
    const activeNames = new Set(active.map((p) => p.name));

    const plugins = available.map((p) => ({
      ...p,
      installed: activeNames.has(p.id),
      activatedAt: active.find((a) => a.name === p.id)?.activatedAt ?? null,
    }));

    return NextResponse.json({ plugins });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list plugins' }, { status: 500 });
  }
}
