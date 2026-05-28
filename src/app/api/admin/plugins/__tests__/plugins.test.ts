import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock(import('@/lib/db'), async (importOriginal) => {
  const actual = await importOriginal();
  const getMock = vi.fn();
  const allMock = vi.fn();
  const runMock = vi.fn();

  const prepareMock = vi.fn().mockImplementation(() => ({
    get: getMock,
    all: allMock,
    run: runMock,
  }));

  return {
    ...actual,
    db: {
      prepare: prepareMock,
      get: getMock,
      all: allMock,
      run: runMock,
    },
    drizzle: {} as any,
  };
});

describe('Admin Plugins API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/plugins', () => {
    it('should filter, search, and return plugins with installs count', async () => {
      const mockPlugins = [
        { name: 'booking', display_name: 'Booking', category: 'core', is_official: 1 },
      ];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 1 });
      const allMock = vi.fn().mockResolvedValue(mockPlugins);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?category=core&status=active&search=booking&limit=10&offset=0'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.plugins).toEqual(mockPlugins);
      expect(data.pagination.total).toBe(1);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('should support inactive status filter in queries', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?status=inactive'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.plugins).toEqual([]);
    });

    it('should return pagination.hasMore true when there are more results', async () => {
      const mockPlugins = [
        { name: 'booking', display_name: 'Booking', category: 'core', is_official: 1 },
      ];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 2 });
      const allMock = vi.fn().mockResolvedValue(mockPlugins);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?limit=1&offset=0'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('should return empty plugins list for search with no matches', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?search=nonexistent'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.plugins).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should return 500 on database error during GET', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Select failed');
      });

      const req = new NextRequest('http://localhost/api/admin/plugins');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Select failed');
    });
  });

  describe('POST /api/admin/plugins', () => {
    it('should return 400 if name or displayName is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ name: 'ical' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for POST with empty request body', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 409 if plugin name already exists', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'existing-plugin-id' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ name: 'ical', displayName: 'iCal Sync' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('Plugin with this name already exists');
    });

    it('should register a new plugin and return 201', async () => {
      const mockPlugin = { id: 'p-new', name: 'ical', display_name: 'iCal Sync' };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPlugin);
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'p-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({
          name: 'ical',
          displayName: 'iCal Sync',
          description: 'Sync bookings via iCal format',
          manifest: { routes: [] },
          configSchema: { apiKey: 'string' },
          requiredRoles: ['manager'],
          dependencies: ['booking'],
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.plugin).toEqual(mockPlugin);
      expect(runMock).toHaveBeenCalled();
    });

    it('should return 500 on database error during POST', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Insert failed');
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ name: 'ical', displayName: 'iCal Sync' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Insert failed');
    });
  });

  describe('PUT /api/admin/plugins', () => {
    it('should return 400 if pluginName or updates is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({ pluginName: 'ical' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for PUT with empty request body', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 404 if plugin is not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(null);

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({ pluginName: 'ical', updates: {} }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Plugin not found');
    });

    it('should return 400 if no valid fields to update are supplied', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ name: 'ical' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          pluginName: 'ical',
          updates: { invalidField: 'ignored' },
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });

    it('should perform dynamic update and return 200', async () => {
      const mockPlugin = { name: 'ical', display_name: 'Updated iCal Sync' };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ name: 'ical' })
        .mockResolvedValueOnce(mockPlugin);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          pluginName: 'ical',
          updates: {
            displayName: 'Updated iCal Sync',
            manifest: { routes: ['/ical'] },
          },
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.plugin).toEqual(mockPlugin);
      expect(runMock).toHaveBeenCalled();
    });

    it('should return 500 on database error during PUT', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          pluginName: 'ical',
          updates: { displayName: 'iCal' },
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });
  });

  describe('DELETE /api/admin/plugins', () => {
    it('should return 400 if pluginName is missing from query', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins');
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('pluginName is required');
    });

    it('should deactivate plugin and return 200', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?pluginName=ical'
      );
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Plugin "ical" has been deactivated from the marketplace');
      expect(runMock).toHaveBeenCalled();
    });

    it('should return 500 on database error during DELETE', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Deactivate failed');
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?pluginName=ical'
      );
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Deactivate failed');
    });
  });
});
