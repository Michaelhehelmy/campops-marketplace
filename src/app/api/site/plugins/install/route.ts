import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { PluginLoader, PlanRequirementError, PluginNotFoundError } from '@/lib/PluginLoader';
import { requireSession, isErrorResponse } from '@/lib/auth-middleware';
import { validateBody } from '@/lib/validate';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const installSchema = z.object({
  siteId: z.string().uuid(),
  pluginId: z.string().min(1).max(100),
  plan: z.string().max(50).optional().default('basic'),
  actorId: z.string().uuid().optional(),
});

/**
 * POST /api/site/plugins/install
 * Body: { siteId, pluginId, plan, actorId? }
 * Activates a plugin for a site, respecting plan requirements.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (isErrorResponse(session)) return session;

  const [body, error] = await validateBody(req, installSchema);
  if (error) return error;

  const { siteId, pluginId, plan, actorId } = body;

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
