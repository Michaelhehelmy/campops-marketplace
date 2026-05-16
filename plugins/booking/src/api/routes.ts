import type { PluginAPI } from '@campops/plugin-sdk';
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
      const body = await req.json();
      const validated = createBookingSchema.parse(body) as CreateBookingInput;
      const booking = await bookingService.createBooking(validated);

      // Emit BOOKING_CREATED hook
      await api.executeHook('BOOKING_CREATED', {
        bookingId: booking.id,
        guestName: booking.guest_name,
        totalPrice: booking.total_price,
        timestamp: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ booking }), { status: 201 });
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
