import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index';
import { registerRoutes } from '../src/api/routes';

function createMockPluginAPI() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      addSlotComponent: vi.fn(),
      addSettingsPage: vi.fn(),
    },
    registerHook: vi.fn().mockReturnValue(() => {}),
    executeHook: vi.fn().mockResolvedValue({}),
    registerRoute: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'guest@test.com', role: 'guest' },
      }),
    },
  };
}

function findRouteHandler(api: any, path: string, method: string): Function {
  const routeCalls = (api.registerRoute as any).mock.calls;
  const entry = routeCalls.find((c: any) => c[0] === path && c[1]?.[method]);
  if (entry) return entry[1][method];
  const postEntry = routeCalls.find((c: any) => c[0] === path && typeof c[1] === 'function');
  return postEntry ? postEntry[1] : () => new Response('Not found', { status: 404 });
}

const checkedOutBooking = {
  id: 'bk-1',
  listing_id: 'listing-1',
  guest_email: 'guest@test.com',
  status: 'checked_out',
};

describe('Reviews Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the reviews table on init', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.db.createTable).toHaveBeenCalledWith('reviews', expect.any(String));
  });

  it('registers indexes', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const indexCalls = (api.db.execute as any).mock.calls.map((c: any) => c[0]);
    expect(indexCalls.some((sql: string) => sql.includes('idx_reviews_listing'))).toBe(true);
    expect(indexCalls.some((sql: string) => sql.includes('idx_reviews_booking'))).toBe(true);
    expect(indexCalls.some((sql: string) => sql.includes('idx_reviews_guest'))).toBe(true);
  });

  it('registers routes', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.registerRoute).toHaveBeenCalled();
  });

  it('creates a review successfully', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn()
      .mockResolvedValueOnce(checkedOutBooking)
      .mockResolvedValueOnce(null);

    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-1', rating: 5, comment: 'Amazing stay!' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rating).toBe(5);
    expect(body.comment).toBe('Amazing stay!');
    expect(api.executeHook).toHaveBeenCalledWith('GUEST_REVIEWED', expect.objectContaining({
      bookingId: 'bk-1',
      rating: 5,
    }));
  });

  it('rejects review creation without auth', async () => {
    const api = createMockPluginAPI();
    api.auth.getSession = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-1', rating: 5, comment: 'Great' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(401);
  });

  it('rejects review for non-existent booking', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bad-id', rating: 5, comment: 'Great' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Booking not found');
  });

  it('rejects review when guest email does not match booking', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      ...checkedOutBooking,
      guest_email: 'other@test.com',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-1', rating: 5, comment: 'Great' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(403);
  });

  it('rejects review for non-checked-out booking', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      ...checkedOutBooking,
      status: 'confirmed',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-1', rating: 5, comment: 'Great' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('completed stays');
  });

  it('rejects duplicate review for same booking', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn()
      .mockResolvedValueOnce(checkedOutBooking)
      .mockResolvedValueOnce({ id: 'existing-review' });

    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews', 'POST');
    const req = new Request('http://localhost/api/p/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk-1', rating: 5, comment: 'Great' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already reviewed');
  });

  it('lists reviews for a listing', async () => {
    const api = createMockPluginAPI();
    api.db.query = vi.fn().mockResolvedValue([
      { id: 'rev-1', rating: 5, title: 'Great', comment: 'Loved it', is_verified: 1, created_at: Date.now(), guest_name: 'Alice' },
      { id: 'rev-2', rating: 4, title: 'Good', comment: 'Nice', is_verified: 0, created_at: Date.now(), guest_name: 'Bob' },
    ]);
    api.db.queryOne = vi.fn().mockResolvedValue({ count: 2 });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/listing/:listingId', 'GET');
    const req = new Request('http://localhost/api/p/reviews/listing/listing-1');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.reviews[0].rating).toBe(5);
  });

  it('returns rating stats for a listing', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({ avg_rating: 4.5, review_count: 10 });
    api.db.query = vi.fn().mockResolvedValue([
      { rating: 5, count: 6 },
      { rating: 4, count: 3 },
      { rating: 3, count: 1 },
    ]);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/stats/:listingId', 'GET');
    const req = new Request('http://localhost/api/p/reviews/stats/listing-1');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.avgRating).toBe(4.5);
    expect(body.reviewCount).toBe(10);
    expect(body.distribution[5]).toBe(6);
    expect(body.distribution[1]).toBe(0);
  });

  it('gets a single review', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'rev-1', rating: 5, title: 'Great', comment: 'Loved it',
      is_verified: 1, created_at: 1000, updated_at: 1000,
      listing_id: 'listing-1', guest_id: 'user-1', booking_id: 'bk-1',
      guest_name: 'Alice', property_name: 'Test Camp',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'GET');
    const req = new Request('http://localhost/api/p/reviews/rev-1');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('rev-1');
    expect(body.rating).toBe(5);
    expect(body.guestName).toBe('Alice');
  });

  it('returns 404 for non-existent review', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'GET');
    const req = new Request('http://localhost/api/p/reviews/nonexistent');
    const res = await handler(req);

    expect(res.status).toBe(404);
  });

  it('updates own review', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValueOnce({
      id: 'rev-1', guest_id: 'user-1', rating: 5,
    }).mockResolvedValueOnce({
      listing_id: 'listing-1',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'PUT');
    const req = new Request('http://localhost/api/p/reviews/rev-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4, comment: 'Updated review' }),
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
  });

  it('rejects update by non-owner', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'rev-1', guest_id: 'user-2', rating: 5,
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'PUT');
    const req = new Request('http://localhost/api/p/reviews/rev-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 3 }),
    });
    const res = await handler(req);

    expect(res.status).toBe(403);
  });

  it('deletes own review', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'rev-1', guest_id: 'user-1', listing_id: 'listing-1',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'DELETE');
    const req = new Request('http://localhost/api/p/reviews/rev-1', { method: 'DELETE' });
    const res = await handler(req);

    expect(res.status).toBe(200);
  });

  it('rejects delete by non-owner non-admin', async () => {
    const api = createMockPluginAPI();
    api.auth.getSession = vi.fn().mockResolvedValue({
      user: { id: 'user-2', email: 'other@test.com', role: 'guest' },
    });
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'rev-1', guest_id: 'user-1', listing_id: 'listing-1',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/reviews/:id', 'DELETE');
    const req = new Request('http://localhost/api/p/reviews/rev-1', { method: 'DELETE' });
    const res = await handler(req);

    expect(res.status).toBe(403);
  });

  it('initializes successfully and returns void', async () => {
    const api = createMockPluginAPI();
    const result = await init(api as any);
    expect(result).toBeUndefined();
  });
});
