import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock db
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
    },
  };
});

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock UIRegistryService
vi.mock('@/lib/UIRegistryService', () => ({
  UIRegistryService: {
    getSlots: vi.fn().mockResolvedValue([]),
    getMenuItems: vi.fn().mockResolvedValue([]),
    getDashboardWidgets: vi.fn().mockResolvedValue([]),
    getSettingsPages: vi.fn().mockResolvedValue([]),
  },
}));

describe('GET /api/plugins/ui-registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.query as any).mockResolvedValue([]);
    (db.queryOne as any).mockResolvedValue(null);
  });

  it('should return 200 for public listing without propertyId', async () => {
    // Public listing pages can access UI registry without authentication
    const mockPlugins = [
      {
        plugin_name: 'pwa',
        manifest: {
          slots: { 'dashboard.top': ['pwa:PWAInstallBanner'] },
        },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);

    const req = new NextRequest('http://localhost/api/plugins/ui-registry');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.context).toBe('listing');
  });

  it('should aggregate plugin manifests for a given propertyId', async () => {
    const mockPlugins = [
      {
        plugin_name: 'pwa',
        manifest: {
          slots: { 'listing.top': ['pwa:PWAInstallBanner'] },
          menuItems: [{ id: 'pwa-settings', label: 'PWA', path: '/admin/pwa', order: 10 }],
          dashboardWidgets: [{ id: 'pwa-widget', position: 'sidebar' }],
          settingsPages: [{ id: 'pwa-config', label: 'Config', path: '/pwa/config' }],
          adminPages: [
            {
              title: 'PWA Logs',
              path: '/admin/pwa/logs',
              table: 'plugin_pwa_logs',
              columns: ['id', 'message'],
            },
          ],
        },
      },
    ];

    (db.query as any).mockResolvedValue(mockPlugins);
    (db.queryOne as any).mockResolvedValue({ id: 'prop-123' });

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-123');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.uiVersion).toBe('1.0.0');
    expect(data.slots['listing.top']).toContain('pwa:PWAInstallBanner');
    expect(data.menuItems[0].label).toBe('PWA');
    expect(data.dashboardWidgets[0].id).toBe('pwa-widget');
    expect(data.settingsPages[0].id).toBe('pwa-config');
    expect(data.adminPages[0].title).toBe('PWA Logs');
  });

  it('should handle DB errors gracefully', async () => {
    (db.query as any).mockRejectedValue(new Error('DB Error'));
    (db.queryOne as any).mockRejectedValue(new Error('DB Error'));

    const req = new NextRequest('http://localhost/api/plugins/ui-registry?propertyId=prop-123');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('DB Error');
  });

  it('should return official plugins for marketplace_master if no settings exist', async () => {
    // 1st call for settings returns empty
    // 2nd call for official plugins returns data
    const mockOfficialPlugins = [
      {
        plugin_name: 'official-plugin',
        manifest: { slots: { main: ['comp1'] } },
        display_name: 'Official Plugin',
      },
    ];

    (db.query as any).mockResolvedValue(mockOfficialPlugins);

    const req = new NextRequest(
      'http://localhost/api/plugins/ui-registry?userId=user-1&role=marketplace_master'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.context).toBe('master');
    expect(data.slots['main']).toContain('official-plugin:comp1');
  });
});
