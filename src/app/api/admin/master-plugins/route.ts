import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { z } from 'zod';

const toggleMasterPluginSchema = z.object({
  pluginName: z.string(),
  enabled: z.boolean().optional(),
});

// POST /api/admin/master-plugins - Toggle a plugin for the master dashboard
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const parsed = toggleMasterPluginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const { pluginName, enabled } = parsed.data;

    if (!pluginName) {
      return NextResponse.json({ error: 'pluginName is required' }, { status: 400 });
    }

    // Upsert master plugin setting
    await db
      .prepare(
        `
      INSERT INTO master_plugin_settings (user_id, plugin_name, is_enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, plugin_name) 
      DO UPDATE SET is_enabled = $3, updated_at = CURRENT_TIMESTAMP
    `
      )
      .run(session.user.id, pluginName, enabled);

    return NextResponse.json({
      success: true,
      message: `Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'} for master dashboard`,
    });
  } catch (err: any) {
    logger.error('[Master Plugins API] Error:', err);
    return errorResponse(err);
  }
}

// GET /api/admin/master-plugins - List all plugins with master-specific activation status
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const plugins = await db
      .prepare(
        `
      SELECT 
        ap.name, 
        ap.display_name, 
        ap.category,
        COALESCE(mps.is_enabled, false) as is_master_enabled
      FROM available_plugins ap
      LEFT JOIN master_plugin_settings mps ON mps.plugin_name = ap.name AND mps.user_id = $1
      WHERE ap.is_active = true
    `
      )
      .all(session.user.id);

    return NextResponse.json({ plugins });
  } catch (err: any) {
    logger.error('[Master Plugins GET API] Error:', err);
    return errorResponse(err);
  }
}
