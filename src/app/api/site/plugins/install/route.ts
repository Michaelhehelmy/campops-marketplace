import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { PluginLoader, PlanRequirementError, PluginNotFoundError } from '@/lib/PluginLoader';

export const dynamic = 'force-dynamic';

/**
 * POST /api/site/plugins/install
 * Body: { siteId, pluginId, plan, actorId? }
 * Activates a plugin for a site, respecting plan requirements.
 */
export async function POST(req: NextRequest) {
  let body: { siteId?: string; pluginId?: string; plan?: string; actorId?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { siteId, pluginId, plan = 'basic', actorId } = body;

  if (!siteId || !pluginId) {
    return NextResponse.json({ error: 'siteId and pluginId are required' }, { status: 400 });
  }

  try {
    const db = getSqlite();
    await PluginLoader.activate(db, siteId, pluginId, plan, actorId);
    return NextResponse.json({ success: true, pluginId, siteId });
  } catch (err: any) {
    if (err instanceof PlanRequirementError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof PluginNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to install plugin' }, { status: 500 });
  }
}
