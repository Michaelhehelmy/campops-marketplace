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

describe('GET /api/public/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return categories with property counts', async () => {
    const mockCategories = [
      {
        id: 'safari',
        name: 'Safari',
        slug: 'safari',
        icon: '🦁',
        description: 'Experience wildlife up close',
        count: 12,
      },
      {
        id: 'lodge',
        name: 'Lodge',
        slug: 'lodge',
        icon: '🏠',
        description: 'Comfortable lodge stays',
        count: 8,
      },
    ];

    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue(mockCategories),
    });

    const req = new NextRequest('http://localhost/api/public/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.categories).toEqual(mockCategories);
  });

  it('should return empty array when no categories exist', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    });

    const req = new NextRequest('http://localhost/api/public/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.categories).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    });

    const req = new NextRequest('http://localhost/api/public/categories');
    const res = await GET(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Database connection failed');
  });

  it('should query with proper SQL including JOIN and GROUP BY', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    });

    const req = new NextRequest('http://localhost/api/public/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN property_categories'));
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('GROUP BY'));
  });

  it('should order categories by display_order then name', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    });

    const req = new NextRequest('http://localhost/api/public/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY c.display_order ASC, c.name ASC')
    );
  });
});
