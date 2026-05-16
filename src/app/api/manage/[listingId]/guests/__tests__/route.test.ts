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
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          stays: 2,
          last_stay: '2025-01-01',
          total_spend: 1000,
        },
      ]),
    },
  };
});

describe('Manage Guests API Route', () => {
  it('should return unique guests for a property', async () => {
    const req = new NextRequest('http://localhost/api/manage/prop-1/guests');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guests).toHaveLength(1);
    expect(data.guests[0].name).toBe('John Doe');
    expect(data.guests[0].spend).toBe(1000);
  });

  it('should handle anonymous guests', async () => {
    (db.all as any).mockResolvedValueOnce([
      {
        id: 'user-2',
        name: null,
        email: 'anon@example.com',
        stays: 1,
        last_stay: '2025-02-01',
        total_spend: 500,
      },
    ]);

    const req = new NextRequest('http://localhost/api/manage/prop-1/guests');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guests[0].name).toBe('Anonymous');
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/manage/prop-1/guests');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
