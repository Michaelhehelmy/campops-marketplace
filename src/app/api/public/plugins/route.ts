import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/plugins?property=<slug_or_id>
 *
 * Returns plugin availability for a specific property.
 * Used by the stay page to determine if booking widget should show.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const propertySlugOrId = searchParams.get('property');

  try {
    // Get all active plugins globally
    const globalPlugins = (await db
      .prepare('SELECT id, name, display_name, is_active FROM available_plugins')
      .all()) as any[];

    if (!propertySlugOrId) {
      return NextResponse.json({
        plugins: globalPlugins.map((p) => ({
          ...p,
          isActive: !!p.is_active,
          displayName: p.display_name,
        })),
      });
    }

    // Get property id from slug or id
    const property = (await db
      .prepare('SELECT id FROM properties WHERE slug = ? OR id = ?')
      .get(propertySlugOrId, propertySlugOrId)) as any;

    if (!property) {
      return NextResponse.json({
        plugins: globalPlugins.map((p) => ({ ...p, isActive: !!p.is_active })),
      });
    }

    const propertyId = property.id;

    // Get per-property plugin overrides
    const propertyPlugins = (await db
      .prepare('SELECT plugin_name, is_enabled FROM property_plugins WHERE property_id = ?')
      .all(propertyId)) as any[];

    const propertyPluginMap = new Map(
      propertyPlugins.map((pp: any) => [pp.plugin_name, !!pp.is_enabled])
    );

    const plugins = globalPlugins.map((p: any) => {
      const hasOverride = propertyPluginMap.has(p.name);
      // If no property-specific entry exists, inherit global is_active (opt-out model).
      // A property can explicitly disable a globally-active plugin via property_plugins.is_enabled=0.
      const isActive = hasOverride ? propertyPluginMap.get(p.name) : !!p.is_active;
      return {
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        isActive,
        isGloballyActive: !!p.is_active,
        hasPropertyOverride: hasOverride,
      };
    });

    return NextResponse.json({ plugins, propertyId });
  } catch (err: any) {
    console.error('[Public Plugins API] Error:', err);
    return NextResponse.json({ plugins: [] }, { status: 500 });
  }
}
