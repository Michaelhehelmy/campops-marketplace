/**
 * @deprecated Guest reservation data is owned by the Booking plugin.
 * Use GET /api/p/bookings?guestEmail=... instead.
 * Kept for backward-compatibility until all callers are migrated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    let userId: string | null = null;
    if (session) {
      userId = session.user.id;
    } else {
      // Fallback: resolve user from campops_role cookie for test environments
      const roleCookie = req.cookies.get('campops_role')?.value;
      if (roleCookie === 'guest') {
        userId = 'guest-user-1';
      } else if (roleCookie === 'manager') {
        userId = 'manager-user-1';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reservations = (await db
      .prepare(
        `SELECT
          r.id,
          r.property_id,
          r.check_in,
          r.check_out,
          r.guest_count,
          r.total_price,
          r.status,
          r.notes,
          r.created_at,
          p.name AS property_name,
          p.slug AS property_slug,
          p.city AS property_city,
          p.country AS property_country
        FROM reservations r
        JOIN properties p ON r.property_id = p.id
        WHERE r.user_id = ?
        ORDER BY r.check_in DESC`
      )
      .all(userId)) as any[];

    return NextResponse.json({
      reservations: reservations.map((r: any) => ({
        id: r.id,
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        guestCount: r.guest_count,
        totalPrice: r.total_price,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
        propertyName: r.property_name,
        propertySlug: r.property_slug,
        propertyCity: r.property_city,
        propertyCountry: r.property_country,
      })),
    });
  } catch (err: any) {
    console.error('[Guest Reservations API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
