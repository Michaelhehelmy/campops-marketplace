/**
 * @deprecated This route contains domain-specific booking logic and is
 * scheduled for removal.  All booking creation should go through the
 * Booking plugin's route at POST /api/p/booking/book.
 *
 * This file is kept temporarily to avoid breaking the existing tests and
 * frontend pages that still reference it.  It will be deleted once the
 * booking plugin's API surface is stable and all callers are migrated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      propertyId,
      roomTypeId,
      checkIn,
      checkOut,
      guestName,
      guestEmail,
      adults = 1,
      paymentProvider = 'pay_later',
      currency = 'USD',
    } = body;

    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve property id from slug or numeric id
    const property = (await db
      .prepare(
        `SELECT id, name, min_price_per_night FROM properties WHERE id = ? OR slug = ? LIMIT 1`
      )
      .get(propertyId, propertyId)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Resolve room type price
    let pricePerNight = property.min_price_per_night ?? 100;
    if (roomTypeId) {
      const rt = (await db
        .prepare(`SELECT base_price_cents FROM room_types WHERE id = ? LIMIT 1`)
        .get(roomTypeId)) as any;
      if (rt) pricePerNight = (rt.base_price_cents ?? 0) / 100;
    }

    const nights = Math.max(
      1,
      Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
    );
    const totalPrice = pricePerNight * nights;
    const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await db
      .prepare(
        `INSERT INTO reservations
          (id, property_id, guest_name, guest_email, check_in, check_out, guest_count, total_price, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))`
      )
      .run(
        reservationId,
        property.id,
        guestName ?? 'Guest',
        guestEmail ?? '',
        checkIn,
        checkOut,
        adults,
        totalPrice
      );

    // Sync with Booking plugin if active
    try {
      const tableExists = await db.tableExists('plugin_booking_bookings');
      if (tableExists) {
        const pId = property.id.toString();
        const rId = roomTypeId || 'room-1';
        const nowSec = Math.floor(Date.now() / 1000);
        await db.execute(`
          INSERT OR IGNORE INTO plugin_booking_bookings
          (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, adults, total_price, currency, status, payment_provider, payment_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'pending', ?, ?)
        `, [
          reservationId,
          pId,
          rId,
          guestName ?? 'Guest',
          guestEmail ?? '',
          checkIn,
          checkOut,
          adults,
          totalPrice,
          currency,
          paymentProvider,
          nowSec,
          nowSec
        ]);
        console.log(`[Public Book] Synced reservation ${reservationId} to plugin_booking_bookings`);
      }
    } catch (e: any) {
      console.warn('[Public Book] Failed to sync to booking plugin:', e.message);
    }

    console.log(
      `[Public Book] Created reservation ${reservationId} for ${guestName} at ${property.name}`
    );

    return NextResponse.json({
      ok: true,
      reservationId,
      status: 'confirmed',
      propertyName: property.name,
      checkIn,
      checkOut,
      totalPrice,
      currency,
    });
  } catch (err: any) {
    console.error('[Public Book API]', err);
    return NextResponse.json({ error: err.message ?? 'Booking failed' }, { status: 500 });
  }
}
