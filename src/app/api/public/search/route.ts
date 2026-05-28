import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { logger } from '@/lib/logger';
import { errorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q') || sp.get('destination') || '';
  const checkIn = sp.get('checkIn') || '';
  const checkOut = sp.get('checkOut') || '';
  const guests = parseInt(sp.get('guests') || sp.get('adults') || '0', 10);
  const category = sp.get('category') || '';
  const minPrice = sp.get('minPrice') ? parseInt(sp.get('minPrice')!, 10) : undefined;
  const maxPrice = sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!, 10) : undefined;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = 12;
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = ['p.is_active = 1'];
    const params: unknown[] = [];

    if (q) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.city LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (minPrice !== undefined) {
      conditions.push('p.min_price_per_night >= ?');
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      conditions.push('p.min_price_per_night <= ?');
      params.push(maxPrice);
    }
    if (category) {
      conditions.push('p.plan = ?');
      params.push(category);
    }
    if (guests > 0) {
      conditions.push(
        'EXISTS (SELECT 1 FROM plugin_booking_rooms r WHERE r.listing_id = p.id AND r.capacity >= ? AND r.is_active = 1)'
      );
      params.push(guests);
    }
    if (checkIn && checkOut) {
      conditions.push(
        "NOT EXISTS (SELECT 1 FROM plugin_booking_bookings b WHERE b.listing_id = p.id AND b.status IN ('confirmed', 'checked_in', 'checked_out') AND b.check_in < ? AND b.check_out > ?)"
      );
      params.push(checkOut, checkIn);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countParams: unknown[] = [...params];
    const dataParams: unknown[] = [...params, limit, offset];

    const db = getSqlite();
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM properties p ${whereClause}`
    ).get(...countParams) as { total: number };
    const totalCount = countRow?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    const rows = db.prepare(`
      SELECT p.id, p.slug, p.name, p.description, p.city, p.country,
             p.plan as "type", p.min_price_per_night, p.price_per_night,
             p.currency_code, p.primary_image, p.amenities, p.rating,
             p.is_featured
      FROM properties p
      ${whereClause}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...dataParams) as any[];

    const properties = rows.map((p: any) => {
      let roomTypes: any[] = [];
      try {
        roomTypes = db.prepare(
          'SELECT id, name, capacity, base_price as price, currency FROM plugin_booking_rooms WHERE listing_id = ? AND is_active = 1 ORDER BY base_price ASC'
        ).all(p.id) as any[];
      } catch {
        // no rooms table — property may not be set up yet
      }

      const displayPrice = p.min_price_per_night || (roomTypes[0]?.price ?? 100);
      const displayCurrency = p.currency_code || 'USD';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type || 'camp',
        city: p.city,
        country: p.country,
        location: { lat: null, lon: null },
        currency_code: displayCurrency,
        minPricePerNight: displayPrice,
        displayMinPrice: displayPrice,
        displayCurrency,
        availableRoomTypes: roomTypes.map((rt: any) => ({
          id: rt.id,
          name: rt.name,
          price: rt.price,
          displayPrice: rt.price,
          displayCurrency: rt.currency || displayCurrency,
          capacity: rt.capacity,
          remaining: 5,
        })),
      };
    });

    const nights = checkIn && checkOut
      ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 1;

    return NextResponse.json({
      properties,
      totalCount,
      totalPages,
      page,
      checkIn,
      checkOut,
      nights,
    });
  } catch (err: any) {
    logger.error('[Search API] Error:', err);
    return errorResponse(err);
  }
}
