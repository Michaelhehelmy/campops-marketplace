import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const session = await requireListingAccess(req, params.listingId, [
    'manager',
    'marketplace_master',
  ]);
  if (isErrorResponse(session)) return session;

  const { listingId } = params;

  try {
    const property = db
      .prepare('SELECT id, name FROM properties WHERE id = ? OR slug = ? LIMIT 1')
      .get(listingId, listingId) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const propertyId = property.id;

    const totalBookings = db
      .prepare('SELECT COUNT(*) as count FROM plugin_booking_bookings WHERE listing_id = ?')
      .get(propertyId) as any;

    const activeBookings = db
      .prepare(
        `SELECT COUNT(*) as count FROM plugin_booking_bookings
         WHERE listing_id = ? AND status IN ('confirmed','checked_in')`
      )
      .get(propertyId) as any;

    const cancelledBookings = db
      .prepare(
        `SELECT COUNT(*) as count FROM plugin_booking_bookings
         WHERE listing_id = ? AND status = 'cancelled'`
      )
      .get(propertyId) as any;

    const revenueRow = db
      .prepare(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM plugin_booking_bookings
         WHERE listing_id = ? AND status IN ('confirmed','checked_in','checked_out')`
      )
      .get(propertyId) as any;

    const avgRow = db
      .prepare(
        `SELECT COALESCE(AVG(total_price), 0) as avg
         FROM plugin_booking_bookings
         WHERE listing_id = ? AND status NOT IN ('cancelled','pending')`
      )
      .get(propertyId) as any;

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date().toISOString().slice(0, 7) + '-01';

    const upcomingCheckIns = db
      .prepare(
        `SELECT COUNT(*) as count FROM plugin_booking_bookings
         WHERE listing_id = ? AND status = 'confirmed' AND check_in >= ?`
      )
      .get(propertyId, today) as any;

    const upcomingCheckOuts = db
      .prepare(
        `SELECT COUNT(*) as count FROM plugin_booking_bookings
         WHERE listing_id = ? AND status IN ('confirmed','checked_in') AND check_out >= ?`
      )
      .get(propertyId, today) as any;

    const revenueThisMonth = db
      .prepare(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM plugin_booking_bookings
         WHERE listing_id = ?
           AND status IN ('confirmed','checked_in','checked_out')
           AND check_in >= ?`
      )
      .get(propertyId, firstOfMonth) as any;

    const recentBookings = db
      .prepare(
        `SELECT id, guest_name, guest_email, check_in, check_out, status, total_price, created_at
         FROM plugin_booking_bookings
         WHERE listing_id = ?
         ORDER BY created_at DESC LIMIT 5`
      )
      .all(propertyId) as any[];

    const roomCount = db
      .prepare('SELECT COUNT(*) as count FROM plugin_booking_rooms WHERE listing_id = ?')
      .get(propertyId) as any;

    return NextResponse.json({
      stats: {
        totalBookings: totalBookings?.count ?? 0,
        activeBookings: activeBookings?.count ?? 0,
        cancelledBookings: cancelledBookings?.count ?? 0,
        totalRevenue: revenueRow?.total ?? 0,
        avgBookingValue: avgRow?.avg ?? 0,
        upcomingCheckIns: upcomingCheckIns?.count ?? 0,
        upcomingCheckOuts: upcomingCheckOuts?.count ?? 0,
        revenueThisMonth: revenueThisMonth?.total ?? 0,
        totalRooms: roomCount?.count ?? 0,
      },
      recentBookings: recentBookings.map((b: any) => ({
        id: b.id,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status,
        totalPrice: b.total_price,
        createdAt: b.created_at,
      })),
    });
  } catch (err: any) {
    logger.error('[Dashboard Stats API] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
