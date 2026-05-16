import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/manage/[listingId]/plugins
 *
 * Returns plugin statuses for a specific property.
 */
export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;

    // Get all available plugins
    const availablePlugins = await db
      .prepare(
        `
      SELECT 
        id,
        name,
        display_name as "displayName",
        category,
        is_official as "isOfficial",
        manifest
      FROM available_plugins
      WHERE is_active = 1
    `
      )
      .all();

    // Get enabled plugins for this property
    const propertyPlugins = await db
      .prepare(
        `
      SELECT plugin_name, is_enabled
      FROM property_plugins
      WHERE property_id = ?
    `
      )
      .all(listingId);

    const statuses = availablePlugins.map((plugin: any) => {
      const association = propertyPlugins.find(
        (pp: any) => pp.plugin_name === plugin.id || pp.plugin_name === plugin.name
      );
      return {
        ...plugin,
        isEnabled: association ? !!association.is_enabled : false,
      };
    });

    return NextResponse.json({
      plugins: statuses,
      total: statuses.length,
    });
  } catch (err: any) {
    console.error('[Manage Plugins API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
