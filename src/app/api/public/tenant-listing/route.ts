import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    // 1. Find the tenant and the listing associated with it
    // In our simplified model, we'll assume the tenant has a listing with the same ID or slug
    // or we'll fetch the listing that matches the tenant's primary property.
    let property = await db
      .prepare(
        `
      SELECT p.* FROM properties p
      JOIN tenants t ON t.id = p.tenant_id OR t.slug = p.slug
      WHERE t.id = ? OR t.slug = ?
      LIMIT 1
    `
      )
      .get(tenantId, tenantId);

    // Fallback: Just try to find a property by slug if the JOIN failed
    if (!property) {
      property = await db
        .prepare('SELECT * FROM properties WHERE slug = ? OR id = ?')
        .get(tenantId, tenantId);
    }

    if (!property) {
      return NextResponse.json({ error: 'Listing not found for this tenant' }, { status: 404 });
    }

    const room_types = await db
      .prepare('SELECT * FROM room_types WHERE property_id = ?')
      .all(property.id);

    return NextResponse.json({
      property,
      room_types,
      availability: room_types.map((rt: any) => ({
        room_type_id: rt.id,
        available: 5,
        price: rt.base_price,
      })),
    });
  } catch (err: any) {
    console.error('[Tenant Listing API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
