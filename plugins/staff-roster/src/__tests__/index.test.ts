import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { rosterRouter } from '../routes/roster.js';

function buildMockApi() {
  return {
    pluginId: 'staff-roster',
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

describe('staff-roster plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers the roster API route', () => {
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/staff/roster', expect.any(Object));
  });

  it('registers the staff list route', () => {
    expect(api.registerRoute).toHaveBeenCalledWith('/api/p/staff', expect.any(Object));
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('staff-roster roster routes: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const app = rosterRouter(api as any);
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'shift-1', staff_name: 'John', status: 'scheduled' }]);
    const app = rosterRouter(api as any);
    const req = new Request('http://localhost/?start=2024-01-01&end=2024-01-31');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });
});

describe('staff-roster staff list route: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    await init(api as any);
    const routeCall = (api.registerRoute as any).mock.calls.find(
      (c: any) => c[0] === '/api/p/staff'
    );
    const handler = routeCall[1];
    const req = new Request('http://localhost/api/p/staff?listingId=listing-1');
    const res = await handler.GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without listingId', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    await init(api as any);
    const routeCall = (api.registerRoute as any).mock.calls.find(
      (c: any) => c[0] === '/api/p/staff'
    );
    const handler = routeCall[1];
    const req = new Request('http://localhost/api/p/staff');
    const res = await handler.GET(req);
    expect(res.status).toBe(400);
  });

  it('returns staff with valid session and listingId', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'staff-1', name: 'Alice', role: 'housekeeper', email: 'alice@camp.com' }]);
    await init(api as any);
    const routeCall = (api.registerRoute as any).mock.calls.find(
      (c: any) => c[0] === '/api/p/staff'
    );
    const handler = routeCall[1];
    const req = new Request('http://localhost/api/p/staff?listingId=listing-1');
    const res = await handler.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Alice');
  });
});

describe('staff-roster routes: error handling', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('handles roster query errors', async () => {
    api.db.query.mockRejectedValue(new Error('DB error'));
    const app = rosterRouter(api as any);
    const req = new Request('http://localhost/?start=2024-01-01&end=2024-01-31');
    const res = await app.fetch(req);
    expect(res.status).toBe(500);
  });

  it('handles staff list query errors gracefully', async () => {
    api.db.query.mockRejectedValue(new Error('DB error'));
    await init(api as any);
    const routeCall = (api.registerRoute as any).mock.calls.find(
      (c: any) => c[0] === '/api/p/staff'
    );
    const handler = routeCall[1];
    const req = new Request('http://localhost/api/p/staff?listingId=listing-1');
    const res = await handler.GET(req);
    expect(res.status).toBe(500);
  });
});
