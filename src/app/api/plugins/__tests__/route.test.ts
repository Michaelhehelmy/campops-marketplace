import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrepare = vi.fn();

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getRoute() {
  const { GET, POST, PUT, DELETE } = await import('../route');
  return { GET, POST, PUT, DELETE };
}

describe('Plugins Property API Router (/api/plugins)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/plugins', () => {
    it('returns 400 when propertyId missing', async () => {
      const { GET } = await getRoute();
      const res = await GET(new NextRequest('http://localhost/api/plugins'));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('propertyId query param required');
    });

    it('returns active plugins and their loaded assets', async () => {
      const mockPlugins = [
        {
          plugin_name: 'booking',
          config: '{}',
          installed_version: '1.0.0',
          display_name: 'Bookings',
        },
      ];
      const mockAssets = [
        {
          asset_type: 'js',
          asset_url: 'http://localhost/booking.js',
          target_location: 'head',
          load_order: 1,
        },
      ];

      const allMock = vi
        .fn()
        .mockResolvedValueOnce(mockPlugins) // First prep: SELECT plugins
        .mockResolvedValueOnce(mockAssets); // Second prep: SELECT assets for booking

      mockPrepare.mockReturnValue({
        all: allMock,
        get: vi.fn(),
        run: vi.fn(),
      });

      const { GET } = await getRoute();
      const res = await GET(new NextRequest('http://localhost/api/plugins?propertyId=prop-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.count).toBe(1);
      expect(body.plugins[0].plugin_name).toBe('booking');
      expect(body.plugins[0].assets).toEqual(mockAssets);

      expect(mockPrepare).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM property_plugins')
      );
      expect(mockPrepare).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM plugin_assets'));
    });

    it('returns 500 on database error during GET', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database select failed');
      });

      const { GET } = await getRoute();
      const res = await GET(new NextRequest('http://localhost/api/plugins?propertyId=prop-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Database select failed');
    });
  });

  describe('POST /api/plugins', () => {
    it('returns 400 if required parameters are missing', async () => {
      const { POST } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'POST',
        body: JSON.stringify({ propertyId: 'prop-1' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('propertyId, userId, and pluginName are required');
    });

    it('returns 404 if plugin is not active or missing in marketplace', async () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
      });

      const { POST } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          userId: 'user-1',
          pluginName: 'nonexistent-plugin',
        }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Plugin not found or not available');
    });

    it('enables an existing disabled plugin record', async () => {
      const mockPlugin = { name: 'crm', version: '2.1.0', display_name: 'CRM Support' };
      const mockExisting = { property_id: 'prop-1', plugin_name: 'crm', is_enabled: false };

      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockPlugin) // available_plugins check
        .mockResolvedValueOnce(mockExisting); // property_plugins check
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      mockPrepare.mockReturnValue({
        get: getMock,
        run: runMock,
      });

      const { POST } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          userId: 'user-1',
          pluginName: 'crm',
          config: { theme: 'dark' },
        }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.plugin.plugin_name).toBe('crm');

      // Check UPDATE query call
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE property_plugins'));
      expect(runMock).toHaveBeenNthCalledWith(
        1,
        JSON.stringify({ theme: 'dark' }),
        true,
        'prop-1',
        'crm'
      );

      // Check logging analytics event
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO plugin_analytics')
      );
    });

    it('inserts a new plugin entry if no record exists', async () => {
      const mockPlugin = { name: 'crm', version: '2.1.0', display_name: 'CRM Support' };

      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockPlugin) // available_plugins check
        .mockResolvedValueOnce(null); // property_plugins check (none existing)
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      mockPrepare.mockReturnValue({
        get: getMock,
        run: runMock,
      });

      const { POST } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          userId: 'user-1',
          pluginName: 'crm',
          config: { theme: 'light' },
          autoUpdate: false,
        }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      // Check INSERT query call
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO property_plugins')
      );
      expect(runMock).toHaveBeenNthCalledWith(
        1,
        'prop-1',
        'crm',
        JSON.stringify({ theme: 'light' }),
        '2.1.0',
        false,
        'user-1'
      );
    });

    it('returns 500 on database error during POST', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const { POST } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          userId: 'user-1',
          pluginName: 'crm',
        }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Database insert failed');
    });
  });

  describe('PUT /api/plugins', () => {
    it('returns 400 if required parameters are missing', async () => {
      const { PUT } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'PUT',
        body: JSON.stringify({ propertyId: 'prop-1' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('propertyId, pluginName, and config are required');
    });

    it('returns 404 if plugin is not enabled/exists for property', async () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
      });

      const { PUT } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          propertyId: 'prop-1',
          pluginName: 'crm',
          config: {},
        }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Plugin not enabled for this property');
    });

    it('updates plugin configuration and feature flags successfully', async () => {
      const mockExisting = { property_id: 'prop-1', plugin_name: 'crm' };
      const getMock = vi.fn().mockResolvedValue(mockExisting);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      mockPrepare.mockReturnValue({
        get: getMock,
        run: runMock,
      });

      const { PUT } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          propertyId: 'prop-1',
          pluginName: 'crm',
          config: { updated: true },
          featureFlags: { flagX: true },
        }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify UPDATE statement parameters
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE property_plugins'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SET config = $1'));
      expect(runMock).toHaveBeenNthCalledWith(
        1,
        JSON.stringify({ updated: true }),
        JSON.stringify({ flagX: true }),
        'prop-1',
        'crm'
      );
    });

    it('returns 500 on database error during PUT', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const { PUT } = await getRoute();
      const req = new NextRequest('http://localhost/api/plugins', {
        method: 'PUT',
        body: JSON.stringify({
          propertyId: 'prop-1',
          pluginName: 'crm',
          config: {},
        }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Database update failed');
    });
  });

  describe('DELETE /api/plugins', () => {
    it('returns 400 if required parameters are missing', async () => {
      const { DELETE } = await getRoute();
      const res = await DELETE(new NextRequest('http://localhost/api/plugins'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('propertyId and pluginName are required');
    });

    it('disables plugin configuration and logs analytics event', async () => {
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });
      mockPrepare.mockReturnValue({
        run: runMock,
      });

      const { DELETE } = await getRoute();
      const res = await DELETE(
        new NextRequest(
          'http://localhost/api/plugins?propertyId=prop-1&pluginName=crm&userId=user-1'
        )
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify UPDATE query
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE property_plugins'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SET is_enabled = false'));
      expect(runMock).toHaveBeenNthCalledWith(1, 'prop-1', 'crm');

      // Verify analytics call
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO plugin_analytics')
      );
      expect(runMock).toHaveBeenNthCalledWith(
        2,
        'crm',
        'prop-1',
        'disable',
        JSON.stringify({ disabled_by: 'user-1' })
      );
    });

    it('returns 500 on database error during DELETE', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database delete failed');
      });

      const { DELETE } = await getRoute();
      const res = await DELETE(
        new NextRequest('http://localhost/api/plugins?propertyId=prop-1&pluginName=crm')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Database delete failed');
    });
  });
});
