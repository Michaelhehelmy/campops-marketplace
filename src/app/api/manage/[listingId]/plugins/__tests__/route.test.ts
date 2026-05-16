import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      prepare: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
    },
  };
});

describe('Manage Plugins API Route', () => {
  it('should return plugins statuses for a property', async () => {
    const availablePlugins = [
      {
        id: 'booking',
        name: 'booking',
        displayName: 'Booking',
        category: 'core',
        isOfficial: true,
        manifest: '{}',
      },
      {
        id: 'crm',
        name: 'crm',
        displayName: 'CRM',
        category: 'utility',
        isOfficial: false,
        manifest: '{}',
      },
    ];

    const propertyPlugins = [{ plugin_name: 'booking', is_enabled: 1 }];

    // Mock first call for available_plugins, second for property_plugins
    (db.all as any).mockResolvedValueOnce(availablePlugins).mockResolvedValueOnce(propertyPlugins);

    const req = new NextRequest('http://localhost/api/manage/prop-1/plugins');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plugins).toHaveLength(2);
    expect(data.total).toBe(2);

    const booking = data.plugins.find((p: any) => p.name === 'booking');
    expect(booking.isEnabled).toBe(true);

    const crm = data.plugins.find((p: any) => p.name === 'crm');
    expect(crm.isEnabled).toBe(false);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/manage/prop-1/plugins');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
