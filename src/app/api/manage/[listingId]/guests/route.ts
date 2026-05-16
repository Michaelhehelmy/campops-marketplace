import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;

    // Fetch unique guests who have reservations at this property
    const guests = await db
      .prepare(
        `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        COUNT(r.id) as stays,
        MAX(r.check_in) as last_stay,
        SUM(r.total_price) as total_spend
      FROM users u
      JOIN reservations r ON u.id = r.user_id
      WHERE r.property_id = ? OR r.property_id IN (SELECT id FROM properties WHERE slug = ?)
      GROUP BY u.id
    `
      )
      .all(listingId, listingId);

    return NextResponse.json({
      guests: guests.map((g: any) => ({
        id: g.id,
        name: g.name || 'Anonymous',
        email: g.email,
        stays: g.stays,
        lastStay: g.last_stay,
        spend: g.total_spend || 0,
        rating: 5,
      })),
    });
  } catch (err: any) {
    console.error('[Manager Guests API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
