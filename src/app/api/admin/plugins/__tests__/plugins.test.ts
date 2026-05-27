import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => {
  const getMock = vi.fn();
  const allMock = vi.fn();
  const runMock = vi.fn();

  const prepareMock = vi.fn().mockImplementation(() => ({
    get: getMock,
    all: allMock,
    run: runMock,
  }));

  return {
    db: {
      prepare: prepareMock,
      get: getMock,
      all: allMock,
      run: runMock,
    },
  };
});

describe('Admin Plugins API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/plugins', () => {
    it('should return 400 if adminId is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('adminId is required');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // verifyAdminAccess fails
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins?adminId=user-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized: marketplace_master role required');
    });

    it('should filter, search, and return plugins with installs count', async () => {
      const mockPlugins = [
        { name: 'booking', display_name: 'Booking', category: 'core', is_official: 1 },
      ];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce({ total: 1 }); // count query
      const allMock = vi.fn().mockResolvedValue(mockPlugins); // plugins list

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?adminId=admin-1&category=core&status=active&search=booking&limit=10&offset=0'
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
        .mockResolvedValueOnce({ role: 'marketplace_master' })
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?adminId=admin-1&status=inactive'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.plugins).toEqual([]);
    });

    it('should return 500 on database error during GET', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Select failed');
      });

      const req = new NextRequest('http://localhost/api/admin/plugins?adminId=admin-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Select failed');
    });
  });

  describe('POST /api/admin/plugins', () => {
    it('should return 400 if adminId, name, or displayName is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ name: 'ical' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // verifyAdminAccess fails
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ adminId: 'user-1', name: 'ical', displayName: 'iCal Sync' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 409 if plugin name already exists', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce({ id: 'existing-plugin-id' }); // plugin exists check

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ adminId: 'admin-1', name: 'ical', displayName: 'iCal Sync' }),
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
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce(null) // no existing plugin
        .mockResolvedValueOnce(mockPlugin); // fetch created record
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'p-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({
          adminId: 'admin-1',
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
        body: JSON.stringify({ adminId: 'admin-1', name: 'ical', displayName: 'iCal Sync' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Insert failed');
    });
  });

  describe('PUT /api/admin/plugins', () => {
    it('should return 400 if adminId, pluginName, or updates is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({ pluginName: 'ical' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // verifyAdminAccess fails
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'user-1', pluginName: 'ical', updates: {} }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if plugin is not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce(null); // plugin not found

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'admin-1', pluginName: 'ical', updates: {} }),
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
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce({ name: 'ical' }); // plugin found

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          adminId: 'admin-1',
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
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce({ name: 'ical' }) // plugin exists
        .mockResolvedValueOnce(mockPlugin); // updated record fetch
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          adminId: 'admin-1',
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
          adminId: 'admin-1',
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
    it('should return 400 if adminId or pluginName is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/plugins?pluginName=ical');
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('adminId and pluginName are required');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // verifyAdminAccess fails
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?adminId=user-1&pluginName=ical'
      );
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should deactivate plugin and return 200', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue({ role: 'marketplace_master' }), // verifyAdminAccess
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest(
        'http://localhost/api/admin/plugins?adminId=admin-1&pluginName=ical'
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
        'http://localhost/api/admin/plugins?adminId=admin-1&pluginName=ical'
      );
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Deactivate failed');
    });
  });
});
