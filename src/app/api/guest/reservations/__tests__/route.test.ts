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
      all: vi.fn().mockResolvedValue([
        {
          id: 'res-1',
          property_id: 'prop-1',
          check_in: '2025-01-01',
          check_out: '2025-01-05',
          guest_count: 2,
          total_price: 500,
          status: 'confirmed',
          notes: null,
          created_at: '2024-12-01',
          property_name: 'Test Property',
          property_slug: 'test-prop',
          property_city: 'Test City',
          property_country: 'Test Country',
        },
      ]),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'guest-1' } }),
    },
  },
}));

import { auth } from '@/lib/auth';

describe('Guest Reservations API Route (Deprecated)', () => {
  it('should return reservations for authenticated user', async () => {
    const req = new NextRequest('http://localhost/api/guest/reservations');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reservations).toHaveLength(1);
    expect(data.reservations[0].id).toBe('res-1');
  });

  it('should return 401 for unauthenticated user', async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/guest/reservations');
    // Also mock cookies to prevent fallback to test user
    Object.defineProperty(req, 'cookies', {
      value: { get: () => undefined },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/guest/reservations');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
