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

describe('CRM Plugin', () => {
  it('initializes and registers hook listener', async () => {
    const mockApi = {
      logger: { info: vi.fn() },
      db: { createTable: vi.fn().mockResolvedValue(undefined) },
      ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
      registerHook: vi.fn(),
      registerRoute: vi.fn(),
    };

    await init(mockApi as any);

    expect(mockApi.db.createTable).toHaveBeenCalledWith('activities', expect.any(String));
    expect(mockApi.registerHook).toHaveBeenCalledWith('BOOKING_CREATED', expect.any(Function));
    expect(mockApi.registerRoute).toHaveBeenCalledWith('/api/p/crm/activities', expect.any(Object));
  });

  it('logs activity when BOOKING_CREATED hook is executed', async () => {
    let hookHandler: any;
    const mockExecute = vi.fn().mockResolvedValue({});
    const mockApi = {
      logger: { info: vi.fn() },
      db: {
        createTable: vi.fn().mockResolvedValue(undefined),
        execute: mockExecute,
      },
      ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
      registerRoute: vi.fn(),
      registerHook: (name: string, handler: any) => {
        if (name === 'BOOKING_CREATED') hookHandler = handler;
      },
    };

    await init(mockApi as any);

    // Simulate hook execution
    await hookHandler({ guestEmail: 'john@example.com', totalPrice: 500 });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO plugin_crm_activities'),
      expect.arrayContaining(['john@example.com', 'BOOKING_CREATED'])
    );
  });

  it('provides getActivities method via api route', async () => {
    const mockQuery = vi.fn().mockResolvedValue([]);
    const mockApi = {
      logger: { info: vi.fn() },
      db: {
        createTable: vi.fn().mockResolvedValue(undefined),
        query: mockQuery,
      },
      auth: {
        getSession: vi.fn().mockResolvedValue({ user: { role: 'guest', email: 'Guest A' } }),
      },
      ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
      registerHook: vi.fn(),
      registerRoute: vi.fn(),
    };

    const service = await init(mockApi as any);
    await (service as any).getActivities();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM plugin_crm_activities')
    );

    await (service as any).getActivities('Guest A');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE guest_email = ?'), [
      'Guest A',
    ]);
  });

  describe('GET route handler', () => {
    it('returns 401 if unauthorized', async () => {
      let routeHandler: any;
      const mockApi = {
        logger: { info: vi.fn() },
        db: { createTable: vi.fn().mockResolvedValue(undefined) },
        ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
        registerHook: vi.fn(),
        registerRoute: (path: string, handlers: any) => {
          if (path === '/api/p/crm/activities') routeHandler = handlers.GET;
        },
        auth: { getSession: vi.fn().mockResolvedValue(null) },
      };

      await init(mockApi as any);
      const req = makeRequest('/api/p/crm/activities');
      const res = await routeHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns guest activities if role is guest', async () => {
      let routeHandler: any;
      const mockQuery = vi.fn().mockResolvedValue([{ id: 1, guest_email: 'john@example.com' }]);
      const mockApi = {
        logger: { info: vi.fn() },
        db: {
          createTable: vi.fn().mockResolvedValue(undefined),
          query: mockQuery,
        },
        ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
        registerHook: vi.fn(),
        registerRoute: (path: string, handlers: any) => {
          if (path === '/api/p/crm/activities') routeHandler = handlers.GET;
        },
        auth: {
          getSession: vi
            .fn()
            .mockResolvedValue({ user: { role: 'guest', email: 'john@example.com' } }),
        },
      };

      await init(mockApi as any);
      const req = makeRequest('/api/p/crm/activities');
      const res = await routeHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activities).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE guest_email = ?'), [
        'john@example.com',
      ]);
    });

    it('returns requested guest activities if role is manager and guest_email is provided', async () => {
      let routeHandler: any;
      const mockQuery = vi.fn().mockResolvedValue([]);
      const mockApi = {
        logger: { info: vi.fn() },
        db: {
          createTable: vi.fn().mockResolvedValue(undefined),
          query: mockQuery,
        },
        ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
        registerHook: vi.fn(),
        registerRoute: (path: string, handlers: any) => {
          if (path === '/api/p/crm/activities') routeHandler = handlers.GET;
        },
        auth: {
          getSession: vi
            .fn()
            .mockResolvedValue({ user: { role: 'manager', email: 'manager@example.com' } }),
        },
      };

      await init(mockApi as any);
      const req = makeRequest('/api/p/crm/activities?guest_email=john@example.com');
      const res = await routeHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE guest_email = ?'), [
        'john@example.com',
      ]);
    });

    it('returns all activities if role is manager and no guest_email is provided', async () => {
      let routeHandler: any;
      const mockQuery = vi.fn().mockResolvedValue([]);
      const mockApi = {
        logger: { info: vi.fn() },
        db: {
          createTable: vi.fn().mockResolvedValue(undefined),
          query: mockQuery,
        },
        ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
        registerHook: vi.fn(),
        registerRoute: (path: string, handlers: any) => {
          if (path === '/api/p/crm/activities') routeHandler = handlers.GET;
        },
        auth: {
          getSession: vi
            .fn()
            .mockResolvedValue({ user: { role: 'manager', email: 'manager@example.com' } }),
        },
      };

      await init(mockApi as any);
      const req = makeRequest('/api/p/crm/activities');
      const res = await routeHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM plugin_crm_activities ORDER BY created_at DESC'
      );
    });

    it('returns 500 on database query failure', async () => {
      let routeHandler: any;
      const mockApi = {
        logger: { info: vi.fn() },
        db: {
          createTable: vi.fn().mockResolvedValue(undefined),
          query: vi.fn().mockRejectedValue(new Error('Query failed')),
        },
        ui: { addSlotComponent: vi.fn(), addSettingsPage: vi.fn() },
        registerHook: vi.fn(),
        registerRoute: (path: string, handlers: any) => {
          if (path === '/api/p/crm/activities') routeHandler = handlers.GET;
        },
        auth: {
          getSession: vi
            .fn()
            .mockResolvedValue({ user: { role: 'manager', email: 'manager@example.com' } }),
        },
      };

      await init(mockApi as any);
      const req = makeRequest('/api/p/crm/activities');
      const res = await routeHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Query failed');
    });
  });
});
