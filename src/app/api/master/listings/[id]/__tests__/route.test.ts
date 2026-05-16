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
      get: vi.fn().mockResolvedValue({
        id: 'prop-1',
        name: 'Test Property',
        slug: 'test-prop',
        is_active: 1,
        owner_email: 'owner@example.com',
        owner_full_name: 'Owner Name',
        staff_count: 5,
      }),
      all: vi.fn().mockResolvedValue([
        {
          plugin_name: 'booking',
          is_enabled: 1,
          display_name: 'Booking Plugin',
        },
        {
          plugin_name: 'crm',
          is_enabled: 0,
          display_name: null, // Fallback to plugin_name
        },
      ]),
    },
  };
});

describe('Master Listings Detail API Route', () => {
  it('should return a listing with its plugins', async () => {
    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shop.name).toBe('Test Property');
    expect(data.shop.is_active).toBe(true);
    expect(data.shop.plugins).toHaveLength(2);

    expect(data.shop.plugins[0].display_name).toBe('Booking Plugin');
    expect(data.shop.plugins[0].is_enabled).toBe(true);

    // Check fallback logic for display name
    expect(data.shop.plugins[1].display_name).toBe('crm');
    expect(data.shop.plugins[1].is_enabled).toBe(false);
  });

  it('should return 404 if listing is not found', async () => {
    (db.get as any).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Listing not found');
  });

  it('should handle missing plugin associations gracefully', async () => {
    (db.all as any).mockResolvedValueOnce(null); // return null instead of array

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shop.plugins).toHaveLength(0);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
