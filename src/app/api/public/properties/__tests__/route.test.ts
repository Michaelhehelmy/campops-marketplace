import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockPrepare = vi.fn(() => ({ get: mockGet, all: mockAll }));

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getHandler() {
  const { GET } = await import('../[slug]/route');
  return { GET };
}

describe('GET /api/public/properties/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 404 when property not found', async () => {
    mockGet.mockResolvedValue(null);
    const { GET } = await getHandler();
    const req = new NextRequest('http://localhost/api/public/properties/nonexistent');
    const res = await GET(req, { params: { slug: 'nonexistent' } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Property not found');
  });

  it('returns property with room types and availability', async () => {
    mockGet.mockResolvedValue({
      id: 'prop-1',
      slug: 'safari-camp',
      name: 'Safari Camp',
    });
    mockAll.mockResolvedValue([
      { id: 'rt-1', name: 'Tent', base_price: 100 },
      { id: 'rt-2', name: 'Cabin', base_price: 200 },
    ]);
    const { GET } = await getHandler();
    const req = new NextRequest(
      'http://localhost/api/public/properties/safari-camp?checkIn=2025-01-01&checkOut=2025-01-05'
    );
    const res = await GET(req, { params: { slug: 'safari-camp' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.property.slug).toBe('safari-camp');
    expect(body.room_types).toHaveLength(2);
    expect(body.availability).toHaveLength(2);
    expect(body.availability[0].available).toBe(5);
  });

  it('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('DB failure');
    });
    const { GET } = await getHandler();
    const req = new NextRequest('http://localhost/api/public/properties/bad-slug');
    const res = await GET(req, { params: { slug: 'bad-slug' } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB failure');
  });

  it('returns empty room types when none exist', async () => {
    mockGet.mockResolvedValue({ id: 'prop-2', slug: 'empty-camp', name: 'Empty Camp' });
    mockAll.mockResolvedValue([]);
    const { GET } = await getHandler();
    const req = new NextRequest('http://localhost/api/public/properties/empty-camp');
    const res = await GET(req, { params: { slug: 'empty-camp' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.room_types).toHaveLength(0);
    expect(body.availability).toHaveLength(0);
  });
});
