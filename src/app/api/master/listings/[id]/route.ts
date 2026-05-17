import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/master/listings/[id]
 *
 * Returns a single listing with its plugin associations.
 * Used by the master admin listing detail page.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const shop = (await db
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.slug,
          p.is_active,
          p.created_at,
          u.email as owner_email,
          pr.full_name as owner_full_name,
          pr.phone as owner_phone,
          (SELECT COUNT(*) FROM property_staff WHERE property_id = p.id) as staff_count
        FROM properties p
        LEFT JOIN users u ON u.id = p.owner_id
        LEFT JOIN profiles pr ON pr.user_id = u.id
        WHERE p.id = ? OR p.slug = ?`
      )
      .get(id, id)) as any;

    if (!shop) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Fetch plugin associations
    const propertyPluginsRaw = (await db
      .prepare(
        `SELECT pp.plugin_name, pp.is_enabled, ap.display_name
         FROM property_plugins pp
         LEFT JOIN available_plugins ap ON ap.name = pp.plugin_name
         WHERE pp.property_id = ?`
      )
      .all(shop.id)) as any[];

    const plugins = (propertyPluginsRaw || []).map((p: any) => ({
      plugin_name: p.plugin_name,
      is_enabled: !!p.is_enabled,
      display_name: p.display_name || p.plugin_name,
    }));

    return NextResponse.json({
      shop: {
        ...shop,
        is_active: !!shop.is_active,
        plugins,
        total_revenue_cents: 0,
        reservations_count: 0,
        plan: shop.plan || 'Standard',
      },
    });
  } catch (err: any) {
    console.error('[Master Listings Detail API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/master/listings/[id]
 *
 * Updates listing configurations.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, slug, plan, isActive, city, country } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug is used by another property
    const existing = await db
      .prepare('SELECT id FROM properties WHERE slug = ? AND id != ?')
      .get(slug, id);
    if (existing) {
      return NextResponse.json({ error: 'Slug already in use by another property' }, { status: 400 });
    }

    await db
      .prepare(
        `UPDATE properties 
         SET name = ?, 
             slug = ?, 
             plan = ?, 
             is_active = ?, 
             city = ?, 
             country = ?
         WHERE id = ?`
      )
      .run(name, slug, plan || 'Standard', isActive ? 1 : 0, city || null, country || null, id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Master Listings Update API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

