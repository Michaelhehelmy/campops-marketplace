import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { maintenanceRouter } from '../routes/maintenance.js';

function buildMockApi() {
  return {
    pluginId: 'maintenance',
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

describe('maintenance plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers the maintenance API route', () => {
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/maintenance',
      expect.any(Object)
    );
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('maintenance routes: auth', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
  });

  it('GET returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const router = maintenanceRouter(api as any);
    const req = new Request('http://localhost/api/p/maintenance');
    const res = await router.GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('GET returns 200 with valid session', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
    const router = maintenanceRouter(api as any);
    const req = new Request('http://localhost/api/p/maintenance');
    const res = await router.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests).toEqual([]);
  });
});

describe('maintenance routes: error handling', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(() => {
    api = buildMockApi();
    api.auth.getSession.mockResolvedValue({ user: { id: 'user-1', role: 'manager' } });
  });

  it('handles unexpected errors gracefully', async () => {
    api.auth.getSession.mockRejectedValue(new Error('Auth failure'));
    const router = maintenanceRouter(api as any);
    const req = new Request('http://localhost/api/p/maintenance');
    await expect(router.GET(req)).rejects.toThrow();
  });
});
