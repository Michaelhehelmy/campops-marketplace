import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/master-plugins - Toggle a plugin for the master dashboard
export async function POST(req: NextRequest) {
  try {
    const { adminId, pluginName, enabled } = await req.json();

    if (!adminId || !pluginName) {
      return NextResponse.json({ error: 'adminId and pluginName are required' }, { status: 400 });
    }

    // Verify admin access
    const role = await db
      .prepare(
        `
      SELECT role FROM user_roles 
      WHERE user_id = $1 AND role = 'marketplace_master'
    `
      )
      .get(adminId);

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
      .run(adminId, pluginName, enabled);

    return NextResponse.json({
      success: true,
      message: `Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'} for master dashboard`,
    });
  } catch (err: any) {
    console.error('[Master Plugins API] Error:', err);
    return errorResponse(err);
  }
}

// GET /api/admin/master-plugins - List all plugins with master-specific activation status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

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
      .all(adminId);

    return NextResponse.json({ plugins });
  } catch (err: any) {
    console.error('[Master Plugins GET API] Error:', err);
    return errorResponse(err);
  }
}
