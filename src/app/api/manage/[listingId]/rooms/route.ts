import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const rooms = await db
      .prepare(
        'SELECT * FROM room_types WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?))'
      )
      .all(listingId, listingId);

    return NextResponse.json({
      rooms: rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        price: (r.base_price_cents || 0) / 100,
        capacity: r.capacity || 2,
        status: 'active',
        type: 'Standard',
      })),
    });
  } catch (err: any) {
    console.error('[Manager Rooms API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const body = await req.json();
    const { name, price, capacity } = body;

    const id = 'rt_' + Math.random().toString(36).substring(7);
    const property = await db
      .prepare('SELECT id FROM properties WHERE id = ? OR slug = ?')
      .get(listingId, listingId);
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    await db
      .prepare(
        "INSERT INTO room_types (id, property_id, name, base_price_cents, capacity, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      )
      .run(id, property.id, name, (price || 0) * 100, capacity || 2);

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('[Manager Rooms API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
