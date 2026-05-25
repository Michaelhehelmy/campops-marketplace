import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { housekeepingRouter } from '../routes/housekeeping.js';

function buildMockApi() {
  return {
    pluginId: 'housekeeping',
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

describe('housekeeping plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers the housekeeping API route', () => {
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/housekeeping',
      expect.any(Object)
    );
  });

  it('registers the after_checkout hook', () => {
    expect(api.hooks.register).toHaveBeenCalledWith(
      'reservations.after_checkout',
      expect.any(Function)
    );
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('housekeeping routes: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('GET returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const router = housekeepingRouter(api as any);
    const req = new Request('http://localhost/api/p/housekeeping');
    const res = await router.GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('GET returns 200 with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'task-1', status: 'pending' }]);
    const router = housekeepingRouter(api as any);
    const req = new Request('http://localhost/api/p/housekeeping');
    const res = await router.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
  });

  it('PATCH returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const router = housekeepingRouter(api as any);
    const req = new Request('http://localhost/api/p/housekeeping/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await router.PATCH(req);
    expect(res.status).toBe(401);
  });

  it('PATCH updates task status with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    api.db.execute.mockResolvedValue(undefined);
    const router = housekeepingRouter(api as any);
    const req = new Request('http://localhost/api/p/housekeeping/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await router.PATCH(req);
    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalled();
  });
});

describe('housekeeping routes: error handling', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('GET handles DB errors gracefully', async () => {
    api.db.query.mockRejectedValue(new Error('DB connection failed'));
    const router = housekeepingRouter(api as any);
    const req = new Request('http://localhost/api/p/housekeeping');
    await expect(router.GET(req)).rejects.toThrow();
  });
});
