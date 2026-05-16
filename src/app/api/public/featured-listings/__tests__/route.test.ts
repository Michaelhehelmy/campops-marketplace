import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn(),
  },
  clearMockStore: vi.fn(),
}));

describe('GET /api/public/featured-listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return featured listings with default limit', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi', 'pool'],
      },
    ];

    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue(mockListings),
      get: vi.fn().mockResolvedValue({ count: 1 }),
    });

    const req = new NextRequest('http://localhost/api/public/featured-listings');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.listings).toEqual(mockListings);
    expect(data.total).toBe(1);
  });

  it('should respect limit parameter', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const req = new NextRequest('http://localhost/api/public/featured-listings?limit=5');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1 OFFSET $2'));
  });

  it('should respect skip parameter', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const req = new NextRequest('http://localhost/api/public/featured-listings?skip=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('should return 400 for invalid limit (< 1)', async () => {
    const req = new NextRequest('http://localhost/api/public/featured-listings?limit=0');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('limit must be between 1 and 50');
  });

  it('should return 400 for invalid limit (> 50)', async () => {
    const req = new NextRequest('http://localhost/api/public/featured-listings?limit=51');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('limit must be between 1 and 50');
  });

  it('should return 400 for negative skip', async () => {
    const req = new NextRequest('http://localhost/api/public/featured-listings?skip=-1');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('skip must be >= 0');
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error('Database error')),
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/public/featured-listings');
    const res = await GET(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Database error');
  });

  it('should return empty array when no featured listings exist', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const req = new NextRequest('http://localhost/api/public/featured-listings');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.listings).toEqual([]);
    expect(data.total).toBe(0);
  });
});
