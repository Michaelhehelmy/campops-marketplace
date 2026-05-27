import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-middleware', () => ({
  requireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-user', role: 'marketplace_master' },
    session: { id: 'test-session' },
  }),
  isErrorResponse: vi.fn().mockReturnValue(false),
}));

// Mock db
vi.mock('@/lib/db', () => {
  const mockStmt = {
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: null }),
  };
  return {
    db: {
      prepare: vi.fn().mockReturnValue(mockStmt),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue({ changes: 0, lastInsertRowid: null }),
    },
    clearMockStore: vi.fn(),
  };
});

describe('GET /api/master/plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return all plugins', async () => {
    const mockPlugins = [
      {
        id: 'ical-sync',
        name: 'ical-sync',
        display_name: 'iCal Sync',
        displayName: 'iCal Sync',
        category: 'operations',
        is_official: 1,
        isOfficial: true,
        is_active: 1,
        isActive: true,
        manifest: {},
      },
    ];

    const mockCount = { count: 10 };

    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockPlugins) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockCount) });

    const req = new NextRequest('http://localhost/api/master/plugins');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plugins).toEqual(mockPlugins);
    expect(data.total).toBe(10);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error('Database error')),
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/master/plugins');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should return empty array when no plugins exist', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ count: 0 }) });

    const req = new NextRequest('http://localhost/api/master/plugins');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plugins).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should handle null count result', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(null) });

    const req = new NextRequest('http://localhost/api/master/plugins');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
  });

  it('should handle custom limit and skip parameters', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ count: 0 }) });

    const req = new NextRequest('http://localhost/api/master/plugins?limit=10&skip=5');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/master/plugins/toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should enable a plugin for a property', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ run: vi.fn() });

    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({
        pluginId: 'ical-sync',
        propertyId: '1',
        enabled: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.enabled).toBe(true);
  });

  it('should disable a plugin for a property', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue({ id: 'existing' }),
      run: vi.fn(),
    });

    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({
        pluginId: 'ical-sync',
        propertyId: '1',
        enabled: false,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.enabled).toBe(false);
  });

  it('should return 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({ pluginId: 'ical-sync' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({
        pluginId: 'ical-sync',
        propertyId: '1',
        enabled: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should not create new record when disabling non-existent plugin', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      run: vi.fn(),
    });

    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({
        pluginId: 'ical-sync',
        propertyId: '1',
        enabled: false,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.enabled).toBe(false);
  });

  it('should return 400 when enabled is not a boolean', async () => {
    const req = new NextRequest('http://localhost/api/master/plugins/toggle', {
      method: 'POST',
      body: JSON.stringify({
        pluginId: 'ical-sync',
        propertyId: '1',
        enabled: 'true',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });
});
