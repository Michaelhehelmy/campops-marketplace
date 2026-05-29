import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { registerMaintenanceRoutes } from '../routes/maintenance.js';

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

type MockApi = ReturnType<typeof buildMockApi>;

function getRegisteredHandlers(api: MockApi, path: string) {
  for (const call of api.registerRoute.mock.calls) {
    if (call[0] === path) return call[1];
  }
  return null;
}

describe('maintenance plugin: init()', () => {
  let api: MockApi;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers two maintenance API routes', () => {
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/maintenance',
      expect.objectContaining({ GET: expect.any(Function), POST: expect.any(Function) })
    );
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/maintenance/:id',
      expect.objectContaining({ GET: expect.any(Function), PATCH: expect.any(Function), DELETE: expect.any(Function) })
    );
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('maintenance routes: GET /api/p/maintenance', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/maintenance');
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance');
    const res = await handlers.GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with requests', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 'r1', title: 'Leaky faucet', status: 'open' }]);
    const req = new Request('http://localhost/api/p/maintenance');
    const res = await handlers.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests).toHaveLength(1);
  });

  it('filters by status query param', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    api.db.query.mockResolvedValue([]);
    const req = new Request('http://localhost/api/p/maintenance?status=resolved');
    const res = await handlers.GET(req);
    expect(res.status).toBe(200);
    const calls = (api.db.query as any).mock.calls;
    expect(calls[0][0]).toContain('AND status = ?');
    expect(calls[0][1]).toEqual(['resolved']);
  });
});

describe('maintenance routes: POST /api/p/maintenance', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/maintenance');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fix sink' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(401);
  });

  it('creates a request with valid data', async () => {
    api.db.execute.mockResolvedValue(undefined);
    api.db.queryOne.mockResolvedValue({ id: 'new-id', title: 'Fix sink', status: 'open' });
    const req = new Request('http://localhost/api/p/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fix sink', priority: 'high' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.title).toBe('Fix sink');
  });

  it('returns 400 when title is missing', async () => {
    const req = new Request('http://localhost/api/p/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(400);
  });
});

describe('maintenance routes: GET /api/p/maintenance/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/maintenance/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance/req-1');
    const res = await handlers.GET(req);
    expect(res.status).toBe(401);
  });

  it('returns request by id', async () => {
    api.db.queryOne.mockResolvedValue({ id: 'req-1', title: 'Fix sink', status: 'open' });
    const req = new Request('http://localhost/api/p/maintenance/req-1');
    const res = await handlers.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.request.id).toBe('req-1');
  });

  it('returns 404 for unknown request', async () => {
    api.db.queryOne.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance/req-unknown');
    const res = await handlers.GET(req);
    expect(res.status).toBe(404);
  });
});

describe('maintenance routes: PATCH /api/p/maintenance/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/maintenance/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance/req-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const res = await handlers.PATCH(req);
    expect(res.status).toBe(401);
  });

  it('updates request status', async () => {
    api.db.execute.mockResolvedValue(undefined);
    api.db.queryOne.mockResolvedValue({ id: 'req-1', status: 'in_progress' });
    const req = new Request('http://localhost/api/p/maintenance/req-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const res = await handlers.PATCH(req);
    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalled();
  });
});

describe('maintenance routes: DELETE /api/p/maintenance/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/maintenance/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance/req-1', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(401);
  });

  it('deletes existing request', async () => {
    api.db.queryOne.mockResolvedValue({ id: 'req-1' });
    api.db.execute.mockResolvedValue(undefined);
    const req = new Request('http://localhost/api/p/maintenance/req-1', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalledWith('DELETE FROM plugin_maintenance_requests WHERE id = ?', ['req-1']);
  });

  it('returns 404 when request not found', async () => {
    api.db.queryOne.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/maintenance/req-unknown', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(404);
  });
});

describe('maintenance routes: error handling', () => {
  let api: MockApi;
  let listHandlers: any;

  beforeEach(() => {
    api = buildMockApi();
    registerMaintenanceRoutes(api as any);
    listHandlers = getRegisteredHandlers(api, '/api/p/maintenance');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('GET handles DB errors gracefully', async () => {
    api.db.query.mockRejectedValue(new Error('DB connection failed'));
    const req = new Request('http://localhost/api/p/maintenance');
    await expect(listHandlers.GET(req)).rejects.toThrow();
  });
});
