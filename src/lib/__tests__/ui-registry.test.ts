import { describe, it, expect, vi } from 'vitest';
import { GET } from '../../app/api/plugins/ui-registry/route';
import { NextRequest } from 'next/server';
import { db } from '../db';

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      query: vi.fn(),
      queryOne: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('../UIRegistryService', () => ({
  UIRegistryService: {
    getSlots: vi.fn().mockResolvedValue([]),
    getMenuItems: vi.fn().mockResolvedValue([]),
    getDashboardWidgets: vi.fn().mockResolvedValue([]),
    getSettingsPages: vi.fn().mockResolvedValue([]),
  },
}));

describe('UI Registry API Route', () => {
  it('should return filtered slots for master role', async () => {
    const mockPlugins = [
      {
        plugin_name: 'pwa',
        manifest: { slots: { 'dashboard.top': ['pwa:Banner'] } },
      },
      {
        plugin_name: 'accounting',
        manifest: { slots: { 'master.stats': ['accounting:Widget'] } },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);

    const req = new NextRequest(
      'http://localhost/api/plugins/ui-registry?role=marketplace_master&userId=admin-1'
    );
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('master');
    // pwa:Banner (dashboard.top) should be filtered out for master
    expect(data.slots['dashboard.top']).toBeUndefined();
    // accounting:Widget should be present
    expect(data.slots['master.stats']).toContain('accounting:Widget');
  });

  it('should return all slots for listing role', async () => {
    const mockPlugins = [
      {
        plugin_name: 'pwa',
        manifest: { slots: { 'listing.top': ['pwa:Banner'] } },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);
    (db.queryOne as any).mockResolvedValue({ id: 'prop-1' });

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.slots['listing.top']).toContain('pwa:Banner');
  });

  it('should return 200 for public listing without propertyId', async () => {
    // Public listing pages can access UI registry without authentication
    const req = new NextRequest('http://localhost/api/plugins/ui-registry');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.context).toBe('listing');
  });

  it('should return 400 when userId is provided but role is not master', async () => {
    const req = new NextRequest(
      'http://localhost/api/plugins/ui-registry?userId=user-1&role=admin'
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('propertyId or (userId + role=master) required');
  });

  it('should handle manifest with non-object slots', async () => {
    const mockPlugins = [
      {
        plugin_name: 'test',
        manifest: { slots: 'invalid' },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.slots).toEqual({
      'homepage.hero': ['homepage.hero'],
      'homepage.featured-listings': ['homepage.featured-listings'],
      'homepage.categories': ['homepage.categories'],
    });
  });

  it('should handle manifest with non-array slot keys', async () => {
    const mockPlugins = [
      {
        plugin_name: 'test',
        manifest: { slots: { 'listing.top': 'not-an-array' } },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);
    (db.queryOne as any).mockResolvedValue({ id: 'prop-1' });

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.slots['listing.top']).toEqual([]);
  });

  it('should handle plugins without manifest', async () => {
    const mockPlugins = [
      {
        plugin_name: 'test',
        manifest: null,
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.slots).toEqual({
      'homepage.hero': ['homepage.hero'],
      'homepage.featured-listings': ['homepage.featured-listings'],
      'homepage.categories': ['homepage.categories'],
    });
  });

  it('should handle menuItems without order property', async () => {
    const mockPlugins = [
      {
        plugin_name: 'test',
        manifest: {
          menuItems: [
            { id: 'item1', label: 'Item 1' },
            { id: 'item2', label: 'Item 2', order: 50 },
          ],
        },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);
    (db.queryOne as any).mockResolvedValue({ id: 'prop-1' });

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.menuItems).toHaveLength(2);
  });

  it('should handle database errors gracefully', async () => {
    (db.query as any).mockRejectedValue(new Error('Database error'));
    (db.queryOne as any).mockRejectedValue(new Error('Database error'));

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should use query param for propertyId', async () => {
    const mockPlugins = [
      {
        plugin_name: 'test',
        manifest: { slots: { 'listing.widgets': ['test:Widget'] } },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);
    (db.queryOne as any).mockResolvedValue({ id: 'prop-1' });

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.context).toBe('listing');
    expect(data.slots['listing.widgets']).toContain('test:Widget');
  });
});
