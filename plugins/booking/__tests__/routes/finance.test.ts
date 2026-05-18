import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/manage/[listingId]/finance/route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn(),
  },
  clearMockStore: vi.fn(),
}));

describe('GET /api/manage/:listingId/finance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return financial data for a property', async () => {
    const mockRevenue = { total: 15000 };
    const mockTx = [{ id: 'tx-1', total_price: 1500, created_at: '2026-05-18' }];

    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue(mockRevenue) })
      .mockReturnValueOnce({ all: vi.fn().mockReturnValue(mockTx) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(15000);
    expect(data.commission.rate).toBe(10);
    expect(data.commission.totalPaid).toBe(1500);
  });

  it('should handle database errors gracefully and return zero defaults', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      }),
      all: vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      }),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(0);
    expect(data.commission.totalPaid).toBe(0);
  });

  it('should return zero values when no revenue exists', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ total: 0 }) })
      .mockReturnValueOnce({ all: vi.fn().mockReturnValue([]) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(0);
    expect(data.revenue.thisMonth).toBe(0);
  });

  it('should use default commission rate when commission result is null', async () => {
    const mockRevenue = { total: 15000 };
    const mockTx = [{ id: 'tx-1', total_price: 15000, created_at: '2026-05-18' }];

    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue(mockRevenue) })
      .mockReturnValueOnce({ all: vi.fn().mockReturnValue(mockTx) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.commission.rate).toBe(10); // Default rate
    expect(data.commission.totalPaid).toBe(1500);
  });

  it('should handle null revenue result', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockReturnValue(null) })
      .mockReturnValueOnce({ all: vi.fn().mockReturnValue([]) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(0);
    expect(data.revenue.thisMonth).toBe(0);
  });
});
