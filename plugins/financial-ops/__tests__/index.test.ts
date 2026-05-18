import { describe, it, expect, vi } from 'vitest';
import init from '../src/index';

function makeRequest(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  headers?: Record<string, string>
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('Financial Ops Plugin', () => {
  function buildMockApi(role: string = 'master', email: string = 'test@example.com') {
    const routes = new Map<string, any>();
    const hooks = new Map<string, any>();
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockQuery = vi.fn().mockResolvedValue([{ id: 1, amount: 10 }]);

    return {
      pluginId: 'financial-ops',
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      db: {
        createTable: vi.fn().mockResolvedValue(undefined),
        execute: mockExecute,
        query: mockQuery,
      },
      auth: {
        getSession: vi.fn().mockResolvedValue({ user: { role, email } }),
      },
      registerRoute: vi.fn().mockImplementation((path: string, handler: any) => {
        routes.set(path, handler);
      }),
      registerHook: vi.fn().mockImplementation((name: string, handler: any) => {
        hooks.set(name, handler);
      }),
      ui: {
        addSlotComponent: vi.fn(),
      },
      _internal: { routes, hooks, mockExecute, mockQuery },
    };
  }

  it('initializes and creates commissions table', async () => {
    const api = buildMockApi();
    await init(api as any);

    expect(api.db.createTable).toHaveBeenCalledWith('commissions', expect.any(String));
    expect(api.ui.addSlotComponent).toHaveBeenCalledWith(
      'master.finance',
      'finance:MasterDashboard'
    );
    expect(api.ui.addSlotComponent).toHaveBeenCalledWith(
      'manager.finance',
      'finance:ManagerDashboard'
    );
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/finance/commissions',
      expect.any(Object)
    );
  });

  it('records commission on BOOKING_CREATED', async () => {
    const api = buildMockApi();
    await init(api as any);

    const hook = api._internal.hooks.get('BOOKING_CREATED');
    expect(hook).toBeDefined();

    await hook({ bookingId: 'b-1', listingId: 'tenant-1', totalPrice: 200 });

    expect(api._internal.mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO plugin_financial_ops_commissions'),
      ['b-1', 'b-1', 'tenant-1', 20]
    );
  });

  it('GET /api/p/finance/commissions works for master', async () => {
    const api = buildMockApi('master');
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(makeRequest('/api/p/finance/commissions'));

    expect(res.status).toBe(200);
    expect(api._internal.mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM plugin_financial_ops_commissions ORDER BY created_at')
    );
  });

  it('GET /api/p/finance/commissions filters by tenant-id for staff', async () => {
    const api = buildMockApi('staff');
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(
      makeRequest('/api/p/finance/commissions', 'GET', { 'x-tenant-id': 'tenant-staff' })
    );

    expect(res.status).toBe(200);
    expect(api._internal.mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE listing_id = ?'),
      ['tenant-staff']
    );
  });

  it('GET /api/p/finance/commissions works for master and filters by listing_id', async () => {
    const api = buildMockApi('master');
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(makeRequest('/api/p/finance/commissions?listing_id=listing-123'));

    expect(res.status).toBe(200);
    expect(api._internal.mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE listing_id = ?'),
      ['listing-123']
    );
  });

  it('GET /api/p/finance/commissions returns 400 for staff if x-tenant-id header is missing', async () => {
    const api = buildMockApi('staff');
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(makeRequest('/api/p/finance/commissions'));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Tenant ID required');
  });

  it('GET /api/p/finance/commissions returns 500 on database error', async () => {
    const api = buildMockApi('master');
    api.db.query = vi.fn().mockRejectedValue(new Error('DB failure'));
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(makeRequest('/api/p/finance/commissions'));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('DB failure');
  });

  it('GET /api/p/finance/commissions denies guests', async () => {
    const api = buildMockApi('guest');
    await init(api as any);

    const handler = api._internal.routes.get('/api/p/finance/commissions')!.GET;
    const res = await handler(makeRequest('/api/p/finance/commissions'));

    expect(res.status).toBe(403);
  });
});
