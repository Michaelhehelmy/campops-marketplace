import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-middleware', () => ({
  requireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-user', role: 'marketplace_master' },
    session: { id: 'test-session' },
  }),
  isErrorResponse: vi.fn().mockReturnValue(false),
}));

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn(),
  },
  clearMockStore: vi.fn(),
}));

describe('GET /api/master/listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return all listings with stats', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari',
        pricePerNight: 250,
        rating: 4.8,
        isFeatured: true,
        is_active: 1,
        isActive: true,
        createdAt: '2024-01-01',
        totalBookings: 10,
        totalRevenue: 25000,
      },
    ];

    const mockCount = { count: 4 };
    const mockStats = { active: 4, featured: 2 };

    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockListings) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockCount) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockStats) });

    const req = new NextRequest('http://localhost/api/master/listings');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.listings).toEqual(mockListings);
    expect(data.total).toBe(4);
    expect(data.stats.active).toBe(4);
    expect(data.stats.featured).toBe(2);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error('Database error')),
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/master/listings');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should return empty array when no listings exist', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ count: 0 }) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ active: 0, featured: 0 }) });

    const req = new NextRequest('http://localhost/api/master/listings');
    const res = await GET(req);
    const data = await res.json();

    if (res.status !== 200) {
      console.error('DEBUG ERROR DATA:', data);
    }
    expect(res.status).toBe(200);
    expect(data.listings).toEqual([]);
    expect(data.total).toBe(0);
  });
});
