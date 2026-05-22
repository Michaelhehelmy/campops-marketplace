import { describe, it, expect, vi } from 'vitest';
import { GET, PATCH } from '../route';
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
        is_featured: 1,
        featured_order: 2,
        owner_email: 'owner@example.com',
        owner_full_name: 'Owner Name',
        staff_count: 5,
      }),
      run: vi.fn().mockResolvedValue({ changes: 1 }),
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

  it('should expose is_featured and featured_order in GET response', async () => {
    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shop.is_featured).toBe(true);
    expect(data.shop.featured_order).toBe(2);
  });

  it('should return 404 if listing is not found', async () => {
    ((db as any).get as any).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Listing not found');
  });

  it('should handle missing plugin associations gracefully', async () => {
    ((db as any).all as any).mockResolvedValueOnce(null); // return null instead of array

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shop.plugins).toHaveLength(0);
  });

  it('should handle database errors gracefully', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/master/listings/prop-1');
    const response = await GET(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  // ── PATCH: feature / unfeature ─────────────────────────────────────────────

  it('PATCH feature — sets is_featured=1 and returns featured_order', async () => {
    // Simulate auto-computed max_order query returning 2 → new order = 3
    ((db as any).get as any).mockResolvedValueOnce({ max_order: 2 });
    ((db as any).run as any).mockResolvedValueOnce({ changes: 1 });

    const req = new NextRequest('http://localhost/api/master/listings/prop-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'feature' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PATCH(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.is_featured).toBe(true);
    expect(data.featured_order).toBe(3);
  });

  it('PATCH feature — respects explicit featured_order when provided', async () => {
    ((db as any).run as any).mockResolvedValueOnce({ changes: 1 });

    const req = new NextRequest('http://localhost/api/master/listings/prop-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'feature', featured_order: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PATCH(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.featured_order).toBe(1);
  });

  it('PATCH unfeature — clears is_featured and featured_order', async () => {
    ((db as any).run as any).mockResolvedValueOnce({ changes: 1 });

    const req = new NextRequest('http://localhost/api/master/listings/prop-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'unfeature' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PATCH(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.is_featured).toBe(false);
    expect(data.featured_order).toBeNull();
  });

  it('PATCH with unknown action returns 400', async () => {
    const req = new NextRequest('http://localhost/api/master/listings/prop-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'invalid_action' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PATCH(req, { params: { id: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });
});
