import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrepare = vi.fn();

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getRoute() {
  const { GET } = await import('../route');
  return { GET };
}

describe('GET /api/public/tenant-listing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if tenantId query parameter is missing', async () => {
    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/public/tenant-listing');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Tenant ID is required');
  });

  it('should return 200 with property and room types on successful query', async () => {
    const mockProperty = { id: 'prop-1', name: 'Acacia Camp', slug: 'acacia-camp' };
    const mockRoomTypes = [
      { id: 'rt-1', base_price: 150 },
      { id: 'rt-2', base_price: 250 },
    ];

    const getMock = vi.fn().mockResolvedValue(mockProperty);
    const allMock = vi.fn().mockResolvedValue(mockRoomTypes);

    mockPrepare.mockReturnValue({
      get: getMock,
      all: allMock,
      run: vi.fn(),
    });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/public/tenant-listing?tenantId=acacia');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.property).toEqual(mockProperty);
    expect(data.room_types).toEqual(mockRoomTypes);
    expect(data.availability).toEqual([
      { room_type_id: 'rt-1', available: 5, price: 150 },
      { room_type_id: 'rt-2', available: 5, price: 250 },
    ]);
  });

  it('should return 200 utilizing the fallback query if JOIN fails to find property', async () => {
    const mockProperty = { id: 'prop-1', name: 'Acacia Camp Fallback' };
    const mockRoomTypes: any[] = [];

    const getMock = vi
      .fn()
      .mockResolvedValueOnce(null) // first prepare JOIN gets null
      .mockResolvedValueOnce(mockProperty); // fallback get gets property

    const allMock = vi.fn().mockResolvedValue(mockRoomTypes);

    mockPrepare.mockReturnValue({
      get: getMock,
      all: allMock,
      run: vi.fn(),
    });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/public/tenant-listing?tenantId=acacia');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.property).toEqual(mockProperty);
  });

  it('should return 404 if no property is found', async () => {
    const getMock = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    mockPrepare.mockReturnValue({
      get: getMock,
      all: vi.fn(),
      run: vi.fn(),
    });

    const { GET } = await getRoute();
    const req = new NextRequest(
      'http://localhost/api/public/tenant-listing?tenantId=missing-tenant'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Listing not found for this tenant');
  });

  it('should return 500 on database error', async () => {
    mockPrepare.mockImplementation(() => {
      throw new Error('Database connection lost');
    });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/public/tenant-listing?tenantId=error');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database connection lost');
  });
});
