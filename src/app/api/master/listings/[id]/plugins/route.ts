import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { id } = params;
    const body = await req.json();
    const { pluginName, enabled } = body;

    if (!pluginName) {
      return NextResponse.json({ error: 'Plugin name is required' }, { status: 400 });
    }

    const existing = await db
      .prepare('SELECT id FROM property_plugins WHERE property_id = ? AND plugin_name = ?')
      .get(id, pluginName);

    if (existing) {
      await db
        .prepare(
          'UPDATE property_plugins SET is_enabled = ? WHERE property_id = ? AND plugin_name = ?'
        )
        .run(enabled ? 1 : 0, id, pluginName);
    } else {
      await db
        .prepare(
          'INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp_' + Math.random().toString(36).substring(7), id, pluginName, enabled ? 1 : 0);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error('[Master Plugin API] Error:', err);
    return errorResponse(err);
  }
}
