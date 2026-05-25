import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { posRouter } from '../routes/pos.js';
import { orderRouter } from '../routes/orders.js';

function buildMockApi() {
  return {
    pluginId: 'pos-kds',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
    },
    registerRoute: vi.fn(),
    hooks: {
      register: vi.fn(),
      registerHook: vi.fn().mockReturnValue(() => {}),
      execute: vi.fn().mockResolvedValue({}),
      executeHook: vi.fn().mockResolvedValue({}),
    },
    auth: {
      getSession: vi.fn(),
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

describe('pos-kds plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers both API routes', () => {
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/pos', expect.any(Object));
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/orders', expect.any(Object));
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('pos-kds routes: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('POS route returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const app = posRouter(api as any);
    const req = new Request('http://localhost/items');
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it('POS route returns 200 with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'item-1', name: 'Coffee' }]);
    const app = posRouter(api as any);
    const req = new Request('http://localhost/items');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });

  it('orders route returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const app = orderRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it('orders route lists orders with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'ord-1', status: 'placed' }]);
    const app = orderRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });
});

describe('pos-kds routes: CRUD operations', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('orders route creates a new order', async () => {
    api.db.execute.mockResolvedValue(undefined);
    const app = orderRouter(api as any);
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: 25.50, items: [{ name: 'Coffee', qty: 1, price: 25.50 }] }),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('orders route updates order status', async () => {
    api.db.execute.mockResolvedValue(undefined);
    api.hooks.execute.mockResolvedValue({});
    const app = orderRouter(api as any);
    const req = new Request('http://localhost/ord-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(api.hooks.execute).toHaveBeenCalledWith('pos.order_status_updated', {
      id: 'ord-1',
      status: 'completed',
    });
  });
});

describe('pos-kds routes: error handling', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('handles DB errors on POS items', async () => {
    api.db.query.mockRejectedValue(new Error('DB error'));
    const app = posRouter(api as any);
    const req = new Request('http://localhost/items');
    const res = await app.fetch(req);
    expect(res.status).toBe(500);
  });
});
