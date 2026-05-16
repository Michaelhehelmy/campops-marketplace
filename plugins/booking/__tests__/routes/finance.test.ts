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

describe('GET /api/manage/:listingId/finance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return financial data for a property', async () => {
    const mockRevenue = { total: 15000, this_month: 2500 };
    const mockCommission = { rate_percentage: 10 };

    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockRevenue) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockCommission) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(15000);
    expect(data.revenue.thisMonth).toBe(2500);
    expect(data.commission.rate).toBe(10);
    expect(data.commission.totalPaid).toBe(1500);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should return zero values when no revenue exists', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ total: 0, this_month: 0 }) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ rate_percentage: 10 }) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(0);
    expect(data.revenue.thisMonth).toBe(0);
  });

  it('should use default commission rate when commission result is null', async () => {
    const mockRevenue = { total: 15000, this_month: 2500 };

    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockRevenue) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(null) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.commission.rate).toBe(10); // Default rate
    expect(data.commission.totalPaid).toBe(1500);
  });

  it('should handle null revenue result', async () => {
    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue({ rate_percentage: 15 }) });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/finance');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.revenue.total).toBe(0);
    expect(data.revenue.thisMonth).toBe(0);
  });
});
