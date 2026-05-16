import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn(),
  },
  clearMockStore: vi.fn(),
}));

describe('GET /api/manage/:listingId/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return bookings for a property', async () => {
    const mockBookings = [
      {
        id: 'res-1',
        checkIn: '2025-06-15',
        checkOut: '2025-06-20',
        guestCount: 2,
        totalPrice: 1250,
        status: 'confirmed',
        guest_name: 'Guest User',
        guest_email: 'guest@example.com',
      },
    ];

    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue(mockBookings),
      get: vi.fn().mockResolvedValue({ count: 1 }),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bookings).toEqual(mockBookings);
    expect(data.total).toBe(1);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockRejectedValue(new Error('Database error')),
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should return empty array when no bookings exist', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bookings).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should filter bookings by status', async () => {
    const mockBookings = [
      {
        id: 'res-1',
        checkIn: '2025-06-15',
        checkOut: '2025-06-20',
        guestCount: 2,
        totalPrice: 1250,
        status: 'confirmed',
        guest_name: 'Guest User',
        guest_email: 'guest@example.com',
      },
    ];

    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue(mockBookings),
      get: vi.fn().mockResolvedValue({ count: 1 }),
    });

    const req = new NextRequest(
      'http://localhost/api/manage/safari-camp/bookings?status=confirmed'
    );
    const res = await GET(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bookings).toEqual(mockBookings);
  });

  it('should handle custom limit and skip parameters', async () => {
    (db.prepare as any).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings?limit=10&skip=5');
    const res = await GET(req, { params: { listingId: 'safari-camp' } });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/manage/:listingId/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should create a new booking', async () => {
    const mockProperty = { price_per_night: 250 };

    (db.prepare as any)
      .mockReturnValueOnce({ get: vi.fn().mockResolvedValue(mockProperty) })
      .mockReturnValueOnce({ run: vi.fn() });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings', {
      method: 'POST',
      body: JSON.stringify({
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        check_in: '2025-06-15',
        check_out: '2025-06-20',
        guest_count: 2,
      }),
    });

    const res = await POST(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.booking).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings', {
      method: 'POST',
      body: JSON.stringify({ guest_name: 'Test' }),
    });

    const res = await POST(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 404 for non-existent property', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings', {
      method: 'POST',
      body: JSON.stringify({
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        check_in: '2025-06-15',
        check_out: '2025-06-20',
        guest_count: 2,
      }),
    });

    const res = await POST(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Property not found');
  });

  it('should handle POST database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/manage/safari-camp/bookings', {
      method: 'POST',
      body: JSON.stringify({
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        check_in: '2025-06-15',
        check_out: '2025-06-20',
        guest_count: 2,
      }),
    });

    const res = await POST(req, { params: { listingId: 'safari-camp' } });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
