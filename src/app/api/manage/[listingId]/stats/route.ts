import { NextResponse } from 'next/server';

/**
 * GET /api/manage/[listingId]/stats
 *
 * Returns generic tenant stats.  Domain-specific stats (bookings, revenue,
 * occupancy) are aggregated by the relevant plugins and injected via the
 * plugin UI-registry / dashboard widget slots — they do not belong here.
 */
export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const listingId = params.listingId;

  const { db } = await import('@/lib/db');

  // Generic tenant info
  let tenant = db
    .prepare('SELECT id, name, is_active, plan FROM properties WHERE id = ? OR slug = ?')
    .get(listingId, listingId);
  if (tenant instanceof Promise) tenant = await tenant;

  // Enabled plugin count for this tenant
  let pluginCount = db
    .prepare(
      'SELECT COUNT(*) as count FROM property_plugins WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND is_enabled = 1'
    )
    .get(listingId, listingId);
  if (pluginCount instanceof Promise) pluginCount = await pluginCount;

  // PWA plugin status (generic infrastructure concern)
  let pwaPlugin = db
    .prepare(
      "SELECT is_enabled FROM property_plugins WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND plugin_name = 'pwa'"
    )
    .get(listingId, listingId);
  if (pwaPlugin instanceof Promise) pwaPlugin = await pwaPlugin;

  const stats = {
    tenantId: (tenant as any)?.id || listingId,
    tenantName: (tenant as any)?.name || null,
    plan: (tenant as any)?.plan || 'basic',
    isActive: !!(tenant as any)?.is_active,
    enabledPlugins: (pluginCount as any)?.count || 0,
    pwaActive: !!(pwaPlugin as any)?.is_enabled,
  };

  return NextResponse.json(stats);
}
