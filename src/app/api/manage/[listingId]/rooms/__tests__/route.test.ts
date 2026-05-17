import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
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
          id: 'room-1',
          name: 'Tent',
          description: 'A tent',
          base_price_cents: 5000,
          capacity: 2,
        },
      ]),
      get: vi.fn().mockResolvedValue({ id: 'prop-1' }),
      run: vi.fn(),
    },
  };
});

describe('Manage Rooms API Route', () => {
  it('GET should return rooms for a property', async () => {
    const req = new NextRequest('http://localhost/api/manage/prop-1/rooms');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rooms).toHaveLength(1);
    expect(data.rooms[0].name).toBe('Tent');
    expect(data.rooms[0].price).toBe(50);
  });

  it('GET should handle database errors gracefully', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/manage/prop-1/rooms');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('POST should create a new room', async () => {
    const req = new NextRequest('http://localhost/api/manage/prop-1/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Room',
        price: 100,
        capacity: 4,
      }),
    });

    const response = await POST(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.id).toMatch(/^rt_/);
  });

  it('POST should return 404 if property not found', async () => {
    ((db as any).get as any).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/manage/prop-1/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Room' }),
    });

    const response = await POST(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Property not found');
  });

  it('POST should handle database errors gracefully', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/manage/prop-1/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Room' }),
    });

    const response = await POST(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
