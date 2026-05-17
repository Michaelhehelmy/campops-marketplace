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
          id: 'prop-1',
          name: 'Safari Camp',
          city: 'Nairobi',
          country: 'Kenya',
          min_price_per_night: 15000, // $150.00
          currency_code: 'USD',
        },
      ]),
    },
  };
});

describe('Public Search API Route', () => {
  it('GET should return properties without destination filter', async () => {
    const req = new NextRequest('http://localhost/api/public/search');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.properties).toHaveLength(1);
    expect(data.totalCount).toBe(1);

    const prop = data.properties[0];
    expect(prop.name).toBe('Safari Camp');
    expect(prop.displayMinPrice).toBe(15000);
    expect(prop.displayCurrency).toBe('USD');
    expect(prop.availableRoomTypes).toHaveLength(1);
  });

  it('GET should handle destination filter', async () => {
    const req = new NextRequest('http://localhost/api/public/search?destination=Nairobi');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.properties).toHaveLength(1);

    // Check if query was called with the right param
    expect((db as any).all).toHaveBeenCalledWith('%Nairobi%');
  });

  it('GET should handle database errors gracefully', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/public/search');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('GET should handle properties without min price gracefully', async () => {
    ((db as any).all as any).mockResolvedValueOnce([
      {
        id: 'prop-2',
        name: 'Basic Camp',
        city: 'Somewhere',
        country: 'Nowhere',
        // min_price_per_night is missing
        // currency_code is missing
      },
    ]);

    const req = new NextRequest('http://localhost/api/public/search');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    const prop = data.properties[0];

    expect(prop.displayMinPrice).toBe(100); // Default
    expect(prop.displayCurrency).toBe('USD'); // Default
  });
});
