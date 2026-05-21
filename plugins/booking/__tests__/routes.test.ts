import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerRoutes } from '../src/api/routes.js';

function makeRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function buildMockApi(role: string = 'guest', email: string = 'test@example.com') {
  const routes = new Map<string, any>();
  const executeHook = vi.fn().mockResolvedValue({});
  const idempotencyStore = new Map<string, any>();

  const dbMock: any = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({
      id: 'booking-1',
      guest_name: 'Test Guest',
      total_price: 100,
      currency: 'USD',
      base_price: 50,
    }),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  dbMock.transaction = vi.fn(async (cb) => cb(dbMock));

  return {
    pluginId: 'booking',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    db: dbMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({
        user: { role, email },
      }),
    },
    registerRoute: vi.fn().mockImplementation((path: string, handler: any) => {
      routes.set(path, handler);
    }),
    checkIdempotency: vi.fn(async (key: string) => idempotencyStore.get(key) || null),
    storeIdempotency: vi.fn(async (key: string, resp: any) => {
      idempotencyStore.set(key, resp);
    }),
    executeHook,
    hooks: { executeHook },
    _internal: { routes, executeHook },
  };
}

describe('Booking Plugin Routes', () => {
  it('GET /api/p/bookings requires auth', async () => {
    const api = buildMockApi();
    api.auth.getSession = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = api._internal.routes.get('/api/p/bookings')!.GET;
    const res = await handler(makeRequest('/api/p/bookings'));

    expect(res.status).toBe(401);
  });

  it('GET /api/p/bookings scopes to guestEmail for guest role', async () => {
    const api = buildMockApi('guest', 'guest@example.com');
    const { bookingService } = registerRoutes(api as any);
    vi.spyOn(bookingService, 'getBookings').mockResolvedValue([]);

    const handler = api._internal.routes.get('/api/p/bookings')!.GET;
    await handler(makeRequest('/api/p/bookings'));

    expect(bookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({ guestEmail: 'guest@example.com' })
    );
  });

  it('GET /api/p/bookings scopes to x-tenant-id for staff role', async () => {
    const api = buildMockApi('staff', 'staff@example.com');
    const { bookingService } = registerRoutes(api as any);
    vi.spyOn(bookingService, 'getBookings').mockResolvedValue([]);

    const handler = api._internal.routes.get('/api/p/bookings')!.GET;
    await handler(
      makeRequest('/api/p/bookings', 'GET', undefined, { 'x-tenant-id': 'tenant-abc' })
    );

    expect(bookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: 'tenant-abc' })
    );
  });

  it('PATCH /api/p/booking/:id/check-in requires staff/admin/master', async () => {
    const api = buildMockApi('guest', 'guest@example.com');
    registerRoutes(api as any);

    const handler = api._internal.routes.get('/api/p/booking/:id/check-in')!.PATCH;
    const res = await handler(makeRequest('/api/p/booking/b-1/check-in'));

    expect(res.status).toBe(403);
  });

  it('PATCH /api/p/booking/:id/check-in allowed for master', async () => {
    const api = buildMockApi('master', 'master@example.com');
    registerRoutes(api as any);

    const handler = api._internal.routes.get('/api/p/booking/:id/check-in')!.PATCH;
    const res = await handler(makeRequest('/api/p/booking/b-1/check-in?:id=b-1'));

    expect(res.status).toBe(200);
    expect(api.executeHook).toHaveBeenCalledWith('CHECKIN_COMPLETED', expect.any(Object));
  });

  it('POST /api/p/booking/book creates booking and emits hook', async () => {
    const api = buildMockApi();
    const { bookingService } = registerRoutes(api as any);

    const validBody = {
      listingId: 'tenant-1',
      roomId: 'room-1',
      guestName: 'Jane',
      guestEmail: 'jane@example.com',
      checkIn: '2025-06-15',
      checkOut: '2025-06-17',
    };

    // Need to bypass actual creation, it requires db calls. We mocked db.queryOne to return a room and then a booking.
    const handler = api._internal.routes.get('/api/p/booking/book');
    const res = await handler(makeRequest('/api/p/booking/book', 'POST', validBody));

    expect(res.status).toBe(201);
    expect(api.executeHook).toHaveBeenCalledWith(
      'BOOKING_CREATED',
      expect.objectContaining({
        guestName: 'Test Guest',
      })
    );
  });

  it('POST /api/p/booking/book handles idempotency key correctly', async () => {
    const api = buildMockApi();
    registerRoutes(api as any);

    const validBody = {
      listingId: 'tenant-1',
      roomId: 'room-1',
      guestName: 'Jane',
      guestEmail: 'jane@example.com',
      checkIn: '2025-06-15',
      checkOut: '2025-06-17',
    };

    const handler = api._internal.routes.get('/api/p/booking/book');

    // First request with idempotency key
    const res1 = await handler(
      makeRequest('/api/p/booking/book', 'POST', validBody, {
        'Idempotency-Key': 'key-abc-123',
      })
    );
    expect(res1.status).toBe(201);
    const body1 = await res1.json();

    // Second request with same idempotency key
    const res2 = await handler(
      makeRequest('/api/p/booking/book', 'POST', validBody, {
        'Idempotency-Key': 'key-abc-123',
      })
    );
    expect(res2.status).toBe(201);
    expect(res2.headers.get('X-Cache-Lookup')).toBe('HIT');
    const body2 = await res2.json();
    expect(body2).toEqual(body1);
  });
});
