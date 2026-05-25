import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { inventoryRouter } from '../routes/inventory.js';
import { wasteRouter } from '../routes/waste.js';

function buildMockApi() {
  return {
    pluginId: 'inventory-waste',
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

describe('inventory-waste plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers both API routes', () => {
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/inventory', expect.any(Object));
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/waste', expect.any(Object));
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('inventory routes: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const app = inventoryRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'inv-1', name: 'Tomatoes', quantity: 50 }]);
    const app = inventoryRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('inventory routes: CRUD', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('creates inventory item', async () => {
    api.db.execute.mockResolvedValue(undefined);
    const app = inventoryRouter(api as any);
    const body = { name: 'Flour', category: 'dry', unit: 'kg', quantity: 100, par_level: 20, reorder_point: 10, cost: 0.50 };
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(201);
    expect(api.db.execute).toHaveBeenCalled();
  });
});

describe('waste routes: auth and CRUD', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const app = wasteRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it('returns waste entries with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'waste-1', item: 'Tomatoes', quantity: 5 }]);
    const app = wasteRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('creates waste entry and deducts inventory', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.execute.mockResolvedValue(undefined);
    const app = wasteRouter(api as any);
    const body = { inventory_item_id: 'inv-1', item: 'Tomatoes', quantity: 5, unit: 'kg', reason: 'spoiled', cost: 10 };
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(201);
    expect(api.db.execute).toHaveBeenCalledTimes(2);
  });
});

describe('inventory-waste routes: error handling', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('handles inventory query errors', async () => {
    api.db.query.mockRejectedValue(new Error('DB error'));
    const app = inventoryRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(500);
  });

  it('handles waste query errors', async () => {
    api.db.query.mockRejectedValue(new Error('DB error'));
    const app = wasteRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(500);
  });
});
