import type { CreateBookingInput, CheckInInput, CheckOutInput } from '../schemas';

/**
 * Booking Service
 * ────────────────
 * Core business logic for booking operations
 */
export class BookingService {
  constructor(private db: any) {}

  async createBooking(input: CreateBookingInput) {
    const result = await this.db.transaction(async (tx: any) => {
      const id = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Calculate total price based on nights
      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);
      const nights = Math.max(
        1,
        Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Get room price
      const room = await tx.queryOne(`SELECT * FROM plugin_booking_rooms WHERE id = ?`, [
        input.roomId,
      ]);

      if (!room) {
        throw new Error('Room not found');
      }

      const totalPrice = nights * room.base_price;

      const booking = await tx.queryOne(
        `INSERT INTO plugin_booking_bookings 
         (id, listing_id, room_id, guest_name, guest_email, guest_phone, check_in, check_out, adults, children, total_price, currency, status, special_requests, payment_provider, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [
          id,
          input.listingId,
          input.roomId,
          input.guestName,
          input.guestEmail,
          input.guestPhone,
          input.checkIn,
          input.checkOut,
          input.adults,
          input.children,
          totalPrice,
          room.currency,
          'confirmed',
          input.specialRequests,
          input.paymentProvider,
          'pending',
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        ]
      );

      // Also insert into legacy reservations table so manage/bookings page can see it
      try {
        await tx.execute(
          `INSERT OR IGNORE INTO reservations
           (id, property_id, guest_name, guest_email, check_in, check_out, guest_count, total_price, status, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, datetime('now'))`,
          [
            id,
            input.listingId,
            input.guestName,
            input.guestEmail,
            input.checkIn,
            input.checkOut,
            input.adults,
            totalPrice,
            input.specialRequests || '',
          ]
        );
      } catch (e) {
        console.error('[BookingService] Legacy reservations sync failed:', e);
      }

      return booking;
    });

    if (!result) {
      throw new Error('Failed to create booking transaction');
    }

    return result;
  }

  async getBookings(
    filters: {
      listingId?: string;
      roomId?: string;
      status?: string;
      limit?: number;
      offset?: number;
      guestEmail?: string;
    } = {}
  ) {
    let query = `SELECT * FROM plugin_booking_bookings`;
    const conditions = [];
    const params = [];

    if (filters.listingId) {
      conditions.push('listing_id = ?');
      params.push(filters.listingId);
    }
    if (filters.roomId) {
      conditions.push('room_id = ?');
      params.push(filters.roomId);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.guestEmail) {
      conditions.push('guest_email = ?');
      params.push(filters.guestEmail);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT ${filters.limit}`;
    }
    if (filters.offset) {
      query += ` OFFSET ${filters.offset}`;
    }

    const results = await this.db.query(query, params);
    return results;
  }

  async getBookingById(id: string) {
    const booking = await this.db.queryOne(`SELECT * FROM plugin_booking_bookings WHERE id = ?`, [
      id,
    ]);
    return booking;
  }

  async checkIn(input: CheckInInput) {
    const now = Math.floor(Date.now() / 1000);

    const booking = await this.db.queryOne(
      `UPDATE plugin_booking_bookings 
       SET status = 'checked_in', checked_in_at = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
      [now, now, input.bookingId]
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  async checkOut(input: CheckOutInput) {
    const now = Math.floor(Date.now() / 1000);

    const booking = await this.db.queryOne(
      `UPDATE plugin_booking_bookings 
       SET status = 'checked_out', checked_out_at = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
      [now, now, input.bookingId]
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  async cancelBooking(id: string, guestEmail?: string) {
    const now = Math.floor(Date.now() / 1000);

    const result = await this.db.transaction(async (tx: any) => {
      // If guestEmail provided, verify ownership before cancelling
      if (guestEmail) {
        const existing = await tx.queryOne(
          `SELECT * FROM plugin_booking_bookings WHERE id = ?`,
          [id]
        );
        if (!existing) throw new Error('Booking not found');
        if (existing.guest_email !== guestEmail) {
          throw new Error('Forbidden: booking does not belong to this guest');
        }
      }

      const booking = await tx.queryOne(
        `UPDATE plugin_booking_bookings 
         SET status = 'cancelled', updated_at = ?
         WHERE id = ?
         RETURNING *`,
        [now, id]
      );

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Sync with legacy reservations table
      try {
        await tx.execute(
          `UPDATE reservations SET status = 'cancelled' WHERE id = ?`,
          [id]
        );
      } catch (e) {
        console.error('[BookingService] Legacy reservations sync failed on cancel:', e);
      }

      return booking;
    });

    if (!result) {
      throw new Error('Booking not found');
    }

    return result;
  }
}
