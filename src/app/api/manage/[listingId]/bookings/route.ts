/**
 * @deprecated Domain-specific booking CRUD owned by the Booking plugin.
 * Use GET/POST /api/p/booking/book and GET /api/p/bookings instead.
 * Kept for backward-compatibility until all callers are migrated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    // Resolve property id from slug or id
    const property = (await db
      .prepare(`SELECT id FROM properties WHERE id = ? OR slug = ? LIMIT 1`)
      .get(listingId, listingId)) as any;

    const propertyId = property?.id ?? listingId;

    let sql = `
      SELECT
        r.id,
        r.guest_name,
        r.guest_email,
        r.check_in,
        r.check_out,
        r.guest_count,
        r.total_price,
        r.status,
        r.notes,
        r.created_at
      FROM reservations r
      WHERE r.property_id = ?
    `;
    const args: any[] = [propertyId];

    if (status) {
      sql += ' AND r.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const bookings = (await db.prepare(sql).all(...args)) as any[];

    const countRow = (await db
      .prepare(`SELECT COUNT(*) as count FROM reservations WHERE property_id = ?`)
      .get(propertyId)) as any;

    return NextResponse.json({
      bookings: bookings.map((b: any) => ({
        id: b.id,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
        checkIn: b.check_in,
        checkOut: b.check_out,
        guestCount: b.guest_count,
        totalPrice: b.total_price,
        status: b.status,
        notes: b.notes,
        createdAt: b.created_at,
      })),
      total: countRow?.count ?? 0,
    });
  } catch (err: any) {
    console.error('[Manager Bookings GET]', err);
    return NextResponse.json({ error: err.message ?? 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const body = await req.json();
    const { guest_name, guest_email, check_in, check_out, guest_count } = body;

    if (!guest_name || !guest_email || !check_in || !check_out) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const property = (await db
      .prepare(`SELECT id, min_price_per_night FROM properties WHERE id = ? OR slug = ? LIMIT 1`)
      .get(listingId, listingId)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const nights = Math.max(
      1,
      Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86_400_000)
    );
    const total = (property.min_price_per_night ?? 100) * nights;
    const id = `bk-${Date.now()}`;

    await db
      .prepare(
        `INSERT INTO reservations (id, property_id, guest_name, guest_email, check_in, check_out, guest_count, total_price, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))`
      )
      .run(id, property.id, guest_name, guest_email, check_in, check_out, guest_count ?? 1, total);

    return NextResponse.json({ ok: true, booking: { id, status: 'confirmed' } });
  } catch (err: any) {
    console.error('[Manager Bookings POST]', err);
    return NextResponse.json({ error: err.message ?? 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }

    if (status) {
      await db.prepare(`UPDATE reservations SET status = ? WHERE id = ?`).run(status, id);
    }
    if (notes !== undefined) {
      await db.prepare(`UPDATE reservations SET notes = ? WHERE id = ?`).run(notes, id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Manager Bookings PATCH]', err);
    return NextResponse.json({ error: err.message ?? 'Database error' }, { status: 500 });
  }
}
