import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { PluginLoader } from '@/lib/PluginLoader';
import { requireSession, isErrorResponse } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/site/plugins/:pluginId?siteId=<id>
 * Deactivates a plugin for a site.
 */
export async function DELETE(req: NextRequest, { params }: { params: { pluginId: string } }) {
  const session = await requireSession(req);
  if (isErrorResponse(session)) return session;
  const siteId = req.nextUrl.searchParams.get('siteId');
  const { pluginId } = params;

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const db = getSqlite();
    await PluginLoader.deactivate(db, siteId, pluginId);
    return NextResponse.json({ success: true, pluginId, siteId });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to deactivate plugin' }, { status: 500 });
  }
}
