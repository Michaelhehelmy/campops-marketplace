import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerRoutes } from '../src/routes/index.js';

const TABLE = 'plugin_resource_listings';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function buildRouteMap(api: ReturnType<typeof buildMockApi>) {
  // Map from path -> { GET?, POST?, PATCH? }
  const map = new Map<string, Record<string, (req: Request) => Promise<Response>>>();
  (api.registerRoute as any).mock.calls.forEach(([path, handler]: [string, any]) => {
    map.set(path, handler);
  });
  return map;
}

function buildMockApi(dbOverrides: Record<string, unknown> = {}) {
  return {
    pluginId: 'resource',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      ...dbOverrides,
    },
    registerRoute: vi.fn(),
    hooks: {
      registerHook: vi.fn().mockReturnValue(() => {}),
      executeHook: vi.fn().mockResolvedValue({}),
    },
    ui: {
      addSlotComponent: vi.fn(),
      registerSlot: vi.fn(),
      registerMenuItem: vi.fn(),
      addMenuItem: vi.fn(),
      registerDashboardWidget: vi.fn(),
      addDashboardWidget: vi.fn(),
      registerSettingsPage: vi.fn(),
      addSettingsPage: vi.fn(),
    },
    config: {},
  };
}

// ── GET /api/p/resource/listings ─────────────────────────────────────────────

describe('GET /api/p/resource/listings', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  beforeEach(() => {
    api = buildMockApi();
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('returns listings with default pagination', async () => {
    const mockListings = [
      { id: '1', title: 'Safari Camp', slug: 'safari-camp', is_active: 1 },
      { id: '2', title: 'Beach Resort', slug: 'beach-resort', is_active: 1 },
    ];
    (api.db.query as any).mockResolvedValue(mockListings);

    const handler = routes.get('/api/p/resource/listings')!.GET;
    const res = await handler(makeRequest('/api/p/resource/listings'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.listings).toHaveLength(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
  });

  it('applies search filter', async () => {
    (api.db.query as any).mockResolvedValue([]);

    const handler = routes.get('/api/p/resource/listings')!.GET;
    await handler(makeRequest('/api/p/resource/listings?search=safari'));

    const sql: string = (api.db.query as any).mock.calls[0][0];
    expect(sql).toContain('LIKE');
  });

  it('applies location filter', async () => {
    (api.db.query as any).mockResolvedValue([]);

    const handler = routes.get('/api/p/resource/listings')!.GET;
    await handler(makeRequest('/api/p/resource/listings?location=Kenya'));

    const sql: string = (api.db.query as any).mock.calls[0][0];
    expect(sql).toContain('location LIKE');
  });

  it('applies tier filter', async () => {
    (api.db.query as any).mockResolvedValue([]);

    const handler = routes.get('/api/p/resource/listings')!.GET;
    await handler(makeRequest('/api/p/resource/listings?tier=premium'));

    const params = (api.db.query as any).mock.calls[0][1];
    expect(params).toContain('premium');
  });

  it('returns 400 for invalid tier', async () => {
    const handler = routes.get('/api/p/resource/listings')!.GET;
    const res = await handler(makeRequest('/api/p/resource/listings?tier=ultra'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation error');
  });

  it('applies pagination correctly', async () => {
    (api.db.query as any).mockResolvedValue([]);

    const handler = routes.get('/api/p/resource/listings')!.GET;
    const res = await handler(makeRequest('/api/p/resource/listings?page=3&limit=10'));
    const data = await res.json();

    expect(data.page).toBe(3);
    expect(data.limit).toBe(10);
  });
});

// ── GET /api/p/resource/listings/:slug ───────────────────────────────────────

describe('GET /api/p/resource/listings/:slug', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  beforeEach(() => {
    api = buildMockApi();
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('returns listing when found and active', async () => {
    const mockListing = { id: '1', title: 'Safari Camp', slug: 'safari-camp', is_active: 1 };
    (api.db.queryOne as any).mockResolvedValue(mockListing);

    const handler = routes.get('/api/p/resource/listings/:slug')!.GET;
    const res = await handler(
      makeRequest('/api/p/resource/listings/safari-camp?:slug=safari-camp')
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.listing).toEqual(mockListing);
  });

  it('returns 404 when listing not found', async () => {
    (api.db.queryOne as any).mockResolvedValue(null);

    const handler = routes.get('/api/p/resource/listings/:slug')!.GET;
    const res = await handler(
      makeRequest('/api/p/resource/listings/no-such-listing?:slug=no-such-listing')
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Listing not found');
  });

  it('queries for active listings only', async () => {
    (api.db.queryOne as any).mockResolvedValue(null);

    const handler = routes.get('/api/p/resource/listings/:slug')!.GET;
    await handler(makeRequest('/api/p/resource/listings/test?:slug=test'));

    const sql: string = (api.db.queryOne as any).mock.calls[0][0];
    expect(sql).toContain('is_active = 1');
  });
});

// ── POST /api/p/resource/master/listings ─────────────────────────────────────

describe('POST /api/p/resource/master/listings', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  const validBody = {
    tenant_id: 'tenant-abc',
    title: 'My Listing',
    slug: 'my-listing',
    description: 'A great place',
    location: 'Kenya',
    tier: 'basic',
  };

  beforeEach(() => {
    api = buildMockApi({
      queryOne: vi.fn().mockResolvedValue({
        id: 'new-id',
        ...validBody,
        created_at: new Date().toISOString(),
      }),
    });
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('creates a listing and returns 201', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    const res = await handler(makeRequest('/api/p/resource/master/listings', 'POST', validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.listing).toBeDefined();
  });

  it('executes INSERT with correct columns', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    await handler(makeRequest('/api/p/resource/master/listings', 'POST', validBody));

    const sql: string = (api.db.execute as any).mock.calls[0][0];
    expect(sql).toContain('INSERT INTO plugin_resource_listings');
    expect(sql).toContain('tenant_id');
    expect(sql).toContain('slug');
  });

  it('fires LISTING_CREATED hook', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    await handler(makeRequest('/api/p/resource/master/listings', 'POST', validBody));

    expect(api.hooks.executeHook).toHaveBeenCalledWith(
      'LISTING_CREATED',
      expect.objectContaining({ tenantId: 'tenant-abc', title: 'My Listing' })
    );
  });

  it('returns 400 for missing tenant_id', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings', 'POST', {
        title: 'Test',
        slug: 'test',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('returns 400 for invalid slug (uppercase)', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings', 'POST', {
        tenant_id: 'tenant-1',
        title: 'Test',
        slug: 'INVALID_SLUG',
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    const res = await handler(
      new Request('http://localhost/api/p/resource/master/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })
    );

    expect(res.status).toBe(400);
  });

  it('stores images as JSON string', async () => {
    const handler = routes.get('/api/p/resource/master/listings')!.POST;
    await handler(
      makeRequest('/api/p/resource/master/listings', 'POST', {
        ...validBody,
        images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      })
    );

    const params: unknown[] = (api.db.execute as any).mock.calls[0][1];
    const imagesParam = params.find((p: any) => typeof p === 'string' && p.startsWith('['));
    expect(imagesParam).toBe('["https://example.com/a.jpg","https://example.com/b.jpg"]');
  });
});

// ── POST /api/p/resource/register ─────────────────────────────────────────────

describe('POST /api/p/resource/register', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  const validBody = {
    title: 'New Property',
    email: 'owner@example.com',
    slug: 'new-property',
    tier: 'premium',
    customDomain: 'new-property.com',
  };

  beforeEach(() => {
    api = buildMockApi({
      queryOne: vi.fn().mockResolvedValue(null), // slug is available
    });
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('registers a property and returns 201', async () => {
    const handler = routes.get('/api/p/resource/register')!.POST;
    const res = await handler(makeRequest('/api/p/resource/register', 'POST', validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('submitted successfully');
    expect(data.listingId).toBeDefined();
  });

  it('returns 400 if slug is taken', async () => {
    api = buildMockApi({ queryOne: vi.fn().mockResolvedValue({ id: 'exists' }) });
    registerRoutes(api as any);
    routes = buildRouteMap(api);

    const handler = routes.get('/api/p/resource/register')!.POST;
    const res = await handler(makeRequest('/api/p/resource/register', 'POST', validBody));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Property slug is already taken');
  });

  it('executes INSERT with correct columns and pending state', async () => {
    const handler = routes.get('/api/p/resource/register')!.POST;
    await handler(makeRequest('/api/p/resource/register', 'POST', validBody));

    const sql: string = (api.db.execute as any).mock.calls[0][0];
    const params: unknown[] = (api.db.execute as any).mock.calls[0][1];

    expect(sql).toContain('INSERT INTO plugin_resource_listings');
    // params[5] is is_active (0 = pending)
    expect(params[5]).toBe(0);
    // params[6] is metadata
    expect(params[6]).toContain('new-property.com');
  });

  it('fires PROPERTY_REGISTERED hook', async () => {
    const handler = routes.get('/api/p/resource/register')!.POST;
    await handler(makeRequest('/api/p/resource/register', 'POST', validBody));

    expect(api.hooks.executeHook).toHaveBeenCalledWith(
      'PROPERTY_REGISTERED',
      expect.objectContaining({
        title: 'New Property',
        slug: 'new-property',
        ownerEmail: 'owner@example.com',
      })
    );
  });
});

// ── PATCH /api/p/resource/master/listings/:id ─────────────────────────────────

describe('PATCH /api/p/resource/master/listings/:id', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  const existingListing = {
    id: 'listing-1',
    tenant_id: 'tenant-abc',
    title: 'Old Title',
    slug: 'old-slug',
    tier: 'basic',
    is_active: 1,
  };

  beforeEach(() => {
    api = buildMockApi({
      queryOne: vi
        .fn()
        .mockResolvedValueOnce(existingListing) // first call: existence check
        .mockResolvedValueOnce({ ...existingListing, title: 'New Title' }), // second: return updated
    });
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('updates the listing and returns 200', async () => {
    const handler = routes.get('/api/p/resource/master/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings/listing-1?:id=listing-1', 'PATCH', {
        title: 'New Title',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.listing.title).toBe('New Title');
  });

  it('returns 404 when listing not found', async () => {
    api = buildMockApi({ queryOne: vi.fn().mockResolvedValue(null) });
    registerRoutes(api as any);
    routes = buildRouteMap(api);

    const handler = routes.get('/api/p/resource/master/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings/bad-id?:id=bad-id', 'PATCH', { title: 'Test' })
    );

    expect(res.status).toBe(404);
  });

  it('returns 400 for empty update body', async () => {
    const handler = routes.get('/api/p/resource/master/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings/listing-1?:id=listing-1', 'PATCH', {})
    );

    expect(res.status).toBe(400);
  });

  it('fires LISTING_UPDATED hook', async () => {
    const handler = routes.get('/api/p/resource/master/listings/:id')!.PATCH;
    await handler(
      makeRequest('/api/p/resource/master/listings/listing-1?:id=listing-1', 'PATCH', {
        title: 'New Title',
      })
    );

    expect(api.hooks.executeHook).toHaveBeenCalledWith('LISTING_UPDATED', expect.any(Object));
  });

  it('returns 400 for invalid tier value', async () => {
    const handler = routes.get('/api/p/resource/master/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest('/api/p/resource/master/listings/listing-1?:id=listing-1', 'PATCH', {
        tier: 'diamond',
      })
    );

    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/p/resource/manage/listings/:id ────────────────────────────────

describe('PATCH /api/p/resource/manage/listings/:id (admin)', () => {
  let api: ReturnType<typeof buildMockApi>;
  let routes: Map<string, Record<string, (req: Request) => Promise<Response>>>;

  const existingListing = {
    id: 'listing-2',
    tenant_id: 'tenant-xyz',
    title: 'Resort',
    slug: 'resort',
    tier: 'premium',
    is_active: 1,
  };

  beforeEach(() => {
    api = buildMockApi({
      queryOne: vi
        .fn()
        .mockResolvedValueOnce(existingListing)
        .mockResolvedValueOnce({ ...existingListing, description: 'Updated desc' }),
    });
    registerRoutes(api as any);
    routes = buildRouteMap(api);
  });

  it('updates the listing for matching tenant and returns 200', async () => {
    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest(
        '/api/p/resource/manage/listings/listing-2?:id=listing-2',
        'PATCH',
        { description: 'Updated desc' },
        { 'x-tenant-id': 'tenant-xyz' }
      )
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it('returns 401 when no tenant ID provided', async () => {
    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest('/api/p/resource/manage/listings/listing-2?:id=listing-2', 'PATCH', {
        description: 'Test',
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 when tenant_id does not match', async () => {
    // Mock returns null — listing doesn't belong to this tenant
    api = buildMockApi({ queryOne: vi.fn().mockResolvedValue(null) });
    registerRoutes(api as any);
    routes = buildRouteMap(api);

    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest(
        '/api/p/resource/manage/listings/listing-2?:id=listing-2',
        'PATCH',
        { description: 'Hacked' },
        { 'x-tenant-id': 'wrong-tenant' }
      )
    );

    expect(res.status).toBe(404);
  });

  it('does NOT allow slug changes (limited fields only)', async () => {
    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest(
        '/api/p/resource/manage/listings/listing-2?:id=listing-2',
        'PATCH',
        { slug: 'new-slug', description: 'updated' },
        { 'x-tenant-id': 'tenant-xyz' }
      )
    );

    // Slug is not in AdminUpdateListingSchema, so it should be stripped; response is OK
    // but the executed SQL must NOT include slug
    if (res.status === 200) {
      const sqlCall = (api.db.execute as any).mock.calls[0]?.[0] ?? '';
      expect(sqlCall).not.toContain('slug =');
    }
  });

  it('fires LISTING_UPDATED hook with tenantId', async () => {
    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    await handler(
      makeRequest(
        '/api/p/resource/manage/listings/listing-2?:id=listing-2',
        'PATCH',
        { title: 'New Title' },
        { 'x-tenant-id': 'tenant-xyz' }
      )
    );

    expect(api.hooks.executeHook).toHaveBeenCalledWith(
      'LISTING_UPDATED',
      expect.objectContaining({ tenantId: 'tenant-xyz' })
    );
  });

  it('returns 400 for empty update body', async () => {
    const handler = routes.get('/api/p/resource/manage/listings/:id')!.PATCH;
    const res = await handler(
      makeRequest(
        '/api/p/resource/manage/listings/listing-2?:id=listing-2',
        'PATCH',
        {},
        { 'x-tenant-id': 'tenant-xyz' }
      )
    );

    expect(res.status).toBe(400);
  });
});
