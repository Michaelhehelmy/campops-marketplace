import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/guest/dashboard
 *
 * Returns guest dashboard data including reservations, followed listings, and stats.
 * Requires authentication.
 */
export async function GET(req: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const reservations = await db
      .prepare(
        `
      SELECT 
        r.id,
        r.property_id,
        r.check_in as "checkIn",
        r.check_out as "checkOut",
        r.guest_count as "guestCount",
        r.total_price as "totalPrice",
        r.status,
        p.name as property_name,
        p.slug as property_slug,
        p.primary_image as "primaryImage"
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.check_in DESC
      LIMIT 10
    `
      )
      .all(userId);

    const followedListings = await db
      .prepare(
        `
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.primary_image as "primaryImage",
        p.short_description as "shortDescription",
        p.price_per_night as "pricePerNight"
      FROM property_follows f
      JOIN properties p ON f.property_id = p.id
      WHERE f.user_id = ?
      LIMIT 10
    `
      )
      .all(userId);

    const stats = await db
      .prepare(
        `
      SELECT 
        COUNT(CASE WHEN check_in > datetime('now') THEN 1 END) as "upcomingReservations",
        (SELECT COUNT(*) FROM property_follows WHERE user_id = ?) as "totalFollows"
      FROM reservations
      WHERE user_id = ?
    `
      )
      .get(userId, userId);

    return NextResponse.json({
      user: session.user,
      stats: {
        upcomingReservations: stats?.upcomingReservations || 0,
        totalFollows: stats?.totalFollows || 0,
      },
      reservations: reservations || [],
      followedListings: followedListings || [],
    });
  } catch (err: any) {
    console.error('[Guest Dashboard API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
