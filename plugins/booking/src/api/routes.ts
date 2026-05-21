import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { incrementCounter } from '@/lib/metrics';
import { BookingService } from '../services/BookingService.js';
import { RoomService } from '../services/RoomService.js';
import { hooks } from '../hooks.js';
import {
  checkAvailabilitySchema,
  createBookingSchema,
  checkInSchema,
  checkOutSchema,
  getBookingsSchema,
  type CheckAvailabilityInput,
  type CreateBookingInput,
  type CheckInInput,
  type CheckOutInput,
} from '../schemas.js';

/**
 * Booking Plugin API Routes
 * ──────────────────────────
 * Register API routes via plugin SDK
 */
export function registerRoutes(api: PluginAPI) {
  const bookingService = new BookingService(api.db);
  const roomService = new RoomService(api.db);

  // POST /api/p/booking/check-availability
  api.registerRoute('/api/p/booking/check-availability', async (req: any) => {
    try {
      const body = await req.json();
      console.log('[BookingPlugin] Received check-availability request:', JSON.stringify(body));
      const validated = checkAvailabilitySchema.parse(body) as CheckAvailabilityInput;
      const availableRooms = await roomService.checkAvailability(validated);
      console.log(`[BookingPlugin] Found ${availableRooms.length} available rooms`);
      return new Response(JSON.stringify({ availableRooms }), { status: 200 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error(
          '[BookingPlugin] Zod Validation Error:',
          JSON.stringify(error.errors, null, 2)
        );
        return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
      }
      console.error('[BookingPlugin] Unexpected Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  });

  // POST /api/p/booking/book
  api.registerRoute('/api/p/booking/book', async (req: any) => {
    try {
      const idempotencyKey =
        req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');
      if (idempotencyKey) {
        const cached = await api.checkIdempotency(idempotencyKey);
        if (cached) {
          return new Response(JSON.stringify(cached.body), {
            status: cached.status,
            headers: { 'Content-Type': 'application/json', 'X-Cache-Lookup': 'HIT' },
          });
        }
      }

      const body = await req.json();
      const validated = createBookingSchema.parse(body) as CreateBookingInput;
      const booking = await bookingService.createBooking(validated);

      incrementCounter('bookings_created');

      // Emit BOOKING_CREATED hook
      await api.executeHook('BOOKING_CREATED', {
        bookingId: booking.id,
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        totalPrice: booking.total_price,
        timestamp: new Date().toISOString(),
      });

      const responseBody = { booking };
      if (idempotencyKey) {
        await api.storeIdempotency(idempotencyKey, {
          body: responseBody,
          status: 201,
        });
      }

      return new Response(JSON.stringify(responseBody), { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  });

  // PATCH /api/p/booking/:id/check-in
  api.registerRoute('/api/p/booking/:id/check-in', {
    PATCH: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session || !['master', 'admin', 'staff'].includes(session.user.role as string)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        const url = new URL(req.url);
        const bookingId = url.searchParams.get(':id') || url.pathname.split('/').slice(-2)[0];
        const validated = checkInSchema.parse({ bookingId }) as CheckInInput;
        const booking = await bookingService.checkIn(validated);

        // Emit CHECKIN_COMPLETED hook
        await api.executeHook('CHECKIN_COMPLETED', {
          bookingId: booking.id,
          guestName: booking.guest_name,
          timestamp: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ booking }), { status: 200 });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // PATCH /api/p/booking/:id/check-out
  api.registerRoute('/api/p/booking/:id/check-out', {
    PATCH: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session || !['master', 'admin', 'staff'].includes(session.user.role as string)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        const url = new URL(req.url);
        const bookingId = url.searchParams.get(':id') || url.pathname.split('/').slice(-2)[0];
        const validated = checkOutSchema.parse({ bookingId }) as CheckOutInput;
        const booking = await bookingService.checkOut(validated);

        // Emit CHECKOUT_COMPLETED hook
        await api.executeHook('CHECKOUT_COMPLETED', {
          bookingId: booking.id,
          guestName: booking.guest_name,
          timestamp: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ booking }), { status: 200 });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // ── GET /api/manage/:listingId/bookings ────────────────────────────────────
  // Legacy booking listing for manager dashboard (backward compat)
  api.registerRoute('/api/manage/:listingId/bookings', {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      try {
        const url = new URL(req.url);
        const listingId =
          url.searchParams.get(':listingId') ?? url.pathname.split('/').slice(-2)[0];
        const status = url.searchParams.get('status');

        const property = await api.db.queryOne(
          `SELECT id FROM properties WHERE id = ? OR slug = ? LIMIT 1`,
          [listingId, listingId]
        );

        const propertyId = property?.id ?? listingId;

        let sql = `SELECT r.id, r.guest_name, r.guest_email, r.check_in, r.check_out,
          r.guest_count, r.total_price, r.status, r.notes, r.created_at
          FROM reservations r WHERE r.property_id = ?`;
        const args: any[] = [propertyId];

        if (status) {
          sql += ' AND r.status = ?';
          args.push(status);
        }

        sql += ' ORDER BY r.created_at DESC';

        const bookings = await api.db.query(sql, args);

        const countRow = await api.db.queryOne(
          `SELECT COUNT(*) as count FROM reservations WHERE property_id = ?`,
          [propertyId]
        );

        return new Response(
          JSON.stringify({
            bookings: (bookings as any[]).map((b: any) => ({
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
          }),
          { status: 200 }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message ?? 'Database error' }), {
          status: 500,
        });
      }
    },
    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      try {
        const url = new URL(req.url);
        const listingId =
          url.searchParams.get(':listingId') ?? url.pathname.split('/').slice(-2)[0];
        const body = await req.json();
        const { guest_name, guest_email, check_in, check_out, guest_count } = body;

        if (!guest_name || !guest_email || !check_in || !check_out) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
          });
        }

        const property = await api.db.queryOne(
          `SELECT id, min_price_per_night FROM properties WHERE id = ? OR slug = ? LIMIT 1`,
          [listingId, listingId]
        );

        if (!property) {
          return new Response(JSON.stringify({ error: 'Property not found' }), { status: 404 });
        }

        const nights = Math.max(
          1,
          Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86_400_000)
        );
        const total = (property.min_price_per_night ?? 100) * nights;
        const id = `bk-${Date.now()}`;

        await api.db.execute(
          `INSERT INTO reservations (id, property_id, guest_name, guest_email, check_in, check_out, guest_count, total_price, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))`,
          [id, property.id, guest_name, guest_email, check_in, check_out, guest_count ?? 1, total]
        );

        return new Response(JSON.stringify({ ok: true, booking: { id, status: 'confirmed' } }), {
          status: 201,
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message ?? 'Database error' }), {
          status: 500,
        });
      }
    },
    PATCH: async (req: Request) => {
      try {
        const body = await req.json();
        const { id, status, notes } = body;

        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing booking id' }), { status: 400 });
        }

        if (status) {
          await api.db.execute(`UPDATE reservations SET status = ? WHERE id = ?`, [status, id]);
        }
        if (notes !== undefined) {
          await api.db.execute(`UPDATE reservations SET notes = ? WHERE id = ?`, [notes, id]);
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message ?? 'Database error' }), {
          status: 500,
        });
      }
    },
  });

  // ── GET /api/manage/:listingId/rooms ──────────────────────────────────────
  // Legacy rooms listing for manager dashboard (backward compat)
  api.registerRoute('/api/manage/:listingId/rooms', {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      try {
        const url = new URL(req.url);
        const listingId =
          url.searchParams.get(':listingId') ?? url.pathname.split('/').slice(-2)[0];

        const rooms = await api.db.query(
          `SELECT * FROM room_types WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?))`,
          [listingId, listingId]
        );

        return new Response(
          JSON.stringify({
            rooms: (rooms as any[]).map((r: any) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              price: (r.base_price_cents || 0) / 100,
              capacity: r.capacity || 2,
              status: 'active',
              type: 'Standard',
            })),
          }),
          { status: 200 }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Database error' }), {
          status: 500,
        });
      }
    },
    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      try {
        const url = new URL(req.url);
        const listingId =
          url.searchParams.get(':listingId') ?? url.pathname.split('/').slice(-2)[0];
        const body = await req.json();
        const { name, price, capacity } = body;

        const id = 'rt_' + Math.random().toString(36).substring(7);
        const property = await api.db.queryOne(
          `SELECT id FROM properties WHERE id = ? OR slug = ?`,
          [listingId, listingId]
        );
        if (!property) {
          return new Response(JSON.stringify({ error: 'Property not found' }), { status: 404 });
        }

        await api.db.execute(
          `INSERT INTO room_types (id, property_id, name, base_price_cents, capacity, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [id, property.id, name, (price || 0) * 100, capacity || 2]
        );

        return new Response(JSON.stringify({ ok: true, id }), { status: 201 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Database error' }), {
          status: 500,
        });
      }
    },
  });

  // ── GET /api/guest/reservations ──────────────────────────────────────────
  // Guest reservation list (backward compat)
  api.registerRoute('/api/guest/reservations', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        let userId: string | null = null;
        if (session) {
          userId = session.user.id;
        }

        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const reservations = await api.db.query(
          `SELECT r.id, r.property_id, r.check_in, r.check_out, r.guest_count,
            r.total_price, r.status, r.notes, r.created_at,
            p.name AS property_name, p.slug AS property_slug,
            p.city AS property_city, p.country AS property_country
          FROM reservations r
          JOIN properties p ON r.property_id = p.id
          WHERE r.user_id = ? OR r.guest_email = (SELECT email FROM users WHERE id = ?)
          ORDER BY r.check_in DESC`,
          [userId, userId]
        );

        return new Response(
          JSON.stringify({
            reservations: (reservations as any[]).map((r: any) => ({
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
          }),
          { status: 200 }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Database error' }), {
          status: 500,
        });
      }
    },
  });

  // ── GET /api/guest/reservations/:id ──────────────────────────────────────
  api.registerRoute('/api/guest/reservations/:id', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const reservationId = url.searchParams.get(':id') ?? url.pathname.split('/').pop();
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 });
        }

        const reservation = await api.db.queryOne(
          `SELECT r.id, r.property_id, p.name AS property_name, p.slug AS property_slug,
            r.check_in, r.check_out, r.status, r.total_price AS total_amount, r.guest_count
          FROM reservations r
          LEFT JOIN properties p ON r.property_id = p.id
          WHERE r.id = ? AND r.user_id = ?
          LIMIT 1`,
          [reservationId, userId]
        );

        if (!reservation) {
          return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(reservation), { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
      }
    },
  });

  // GET /api/p/bookings
  api.registerRoute('/api/p/bookings', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const filters = {
          listingId: url.searchParams.get('listing') || undefined,
          roomId: url.searchParams.get('roomId') || undefined,
          status: url.searchParams.get('status') || undefined,
          limit: parseInt(url.searchParams.get('limit') || '50'),
          offset: parseInt(url.searchParams.get('offset') || '0'),
          guestEmail: undefined as string | undefined,
        };

        const role = session.user.role as string;
        // If guest, force filtering by their email
        if (role === 'guest') {
          filters.guestEmail = session.user.email;
        } else if (role !== 'master') {
          // If staff/admin, they should only see bookings for their listing(s).
          // For now, we enforce that they provide listingId or x-tenant-id matches.
          const tenantId = req.headers.get('x-tenant-id');
          if (tenantId) filters.listingId = tenantId;
        }

        const validated = getBookingsSchema.parse(filters);
        // We'll need to pass guestEmail to the service, so we pass it alongside validated
        const bookings = await bookingService.getBookings({
          ...validated,
          guestEmail: filters.guestEmail,
        });
        return new Response(JSON.stringify({ bookings }), { status: 200 });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ error: error.errors }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  return { bookingService, roomService };
}
