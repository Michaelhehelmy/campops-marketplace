import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../index.js';
import { registerHousekeepingRoutes } from '../routes/housekeeping.js';

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

type MockApi = ReturnType<typeof buildMockApi>;

function getRegisteredHandlers(api: MockApi, path: string) {
  for (const call of api.registerRoute.mock.calls) {
    if (call[0] === path) return call[1];
  }
  return null;
}

describe('housekeeping plugin: init()', () => {
  let api: MockApi;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('registers two housekeeping API routes', () => {
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/housekeeping',
      expect.objectContaining({ GET: expect.any(Function), POST: expect.any(Function) })
    );
    expect(api.registerRoute).toHaveBeenCalledWith(
      '/api/p/housekeeping/:id',
      expect.objectContaining({ GET: expect.any(Function), PATCH: expect.any(Function), DELETE: expect.any(Function) })
    );
  });

  it('registers the after_checkout hook', () => {
    expect(api.hooks.register).toHaveBeenCalledWith(
      'reservation:after_checkout',
      expect.any(Function)
    );
  });

  it('logs initialization success', () => {
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized successfully')
    );
  });
});

describe('housekeeping routes: GET /api/p/housekeeping', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/housekeeping');
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping');
    const res = await handlers.GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with tasks', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    api.db.query.mockResolvedValue([{ id: 't1', status: 'pending', category: 'cleaning' }]);
    const req = new Request('http://localhost/api/p/housekeeping');
    const res = await handlers.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
  });

  it('filters by status query param', async () => {
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    api.db.query.mockResolvedValue([]);
    const req = new Request('http://localhost/api/p/housekeeping?status=completed');
    await handlers.GET(req);
    expect(api.db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status = ?'),
      ['completed']
    );
  });
});

describe('housekeeping routes: POST /api/p/housekeeping', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/housekeeping');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: 'r1', category: 'cleaning' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(401);
  });

  it('creates a task with valid data', async () => {
    api.db.execute.mockResolvedValue(undefined);
    api.db.queryOne.mockResolvedValue({ id: 'new-id', room_id: 'r1', category: 'cleaning', status: 'pending' });
    const req = new Request('http://localhost/api/p/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: 'r1', category: 'cleaning' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.task.category).toBe('cleaning');
  });

  it('returns 400 when room_id is missing', async () => {
    const req = new Request('http://localhost/api/p/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'cleaning' }),
    });
    const res = await handlers.POST(req);
    expect(res.status).toBe(400);
  });
});

describe('housekeeping routes: GET /api/p/housekeeping/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/housekeeping/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping/task-1');
    const res = await handlers.GET(req);
    expect(res.status).toBe(401);
  });

  it('returns task by id', async () => {
    api.db.queryOne.mockResolvedValue({ id: 'task-1', status: 'pending' });
    const req = new Request('http://localhost/api/p/housekeeping/task-1');
    const res = await handlers.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.id).toBe('task-1');
  });

  it('returns 404 for unknown task', async () => {
    api.db.queryOne.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping/task-unknown');
    const res = await handlers.GET(req);
    expect(res.status).toBe(404);
  });
});

describe('housekeeping routes: PATCH /api/p/housekeeping/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/housekeeping/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await handlers.PATCH(req);
    expect(res.status).toBe(401);
  });

  it('updates task status', async () => {
    api.db.execute.mockResolvedValue(undefined);
    api.db.queryOne.mockResolvedValue({ id: 'task-1', status: 'completed' });
    const req = new Request('http://localhost/api/p/housekeeping/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await handlers.PATCH(req);
    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalled();
  });
});

describe('housekeeping routes: DELETE /api/p/housekeeping/:id', () => {
  let api: MockApi;
  let handlers: any;

  beforeEach(async () => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    handlers = getRegisteredHandlers(api, '/api/p/housekeeping/:id');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('returns 401 without session', async () => {
    api.auth.getSession.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping/task-1', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(401);
  });

  it('deletes existing task', async () => {
    api.db.queryOne.mockResolvedValue({ id: 'task-1' });
    api.db.execute.mockResolvedValue(undefined);
    const req = new Request('http://localhost/api/p/housekeeping/task-1', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalledWith('DELETE FROM plugin_housekeeping_tasks WHERE id = ?', ['task-1']);
  });

  it('returns 404 when task not found', async () => {
    api.db.queryOne.mockResolvedValue(null);
    const req = new Request('http://localhost/api/p/housekeeping/task-unknown', { method: 'DELETE' });
    const res = await handlers.DELETE(req);
    expect(res.status).toBe(404);
  });
});

describe('housekeeping routes: error handling', () => {
  let api: MockApi;
  let listHandlers: any;

  beforeEach(() => {
    api = buildMockApi();
    registerHousekeepingRoutes(api as any);
    listHandlers = getRegisteredHandlers(api, '/api/p/housekeeping');
    api.auth.getSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
  });

  it('GET handles DB errors gracefully', async () => {
    api.db.query.mockRejectedValue(new Error('DB connection failed'));
    const req = new Request('http://localhost/api/p/housekeeping');
    await expect(listHandlers.GET(req)).rejects.toThrow();
  });
});
