import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) }, handler: vi.fn() },
}));

describe('GET /api/properties', () => {
  it('returns 400 when ownerId missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/properties'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/ownerId/i);
  });

  it('returns properties for a valid ownerId', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/properties?ownerId=owner-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.properties)).toBe(true);
  });
});
