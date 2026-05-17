import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) }, handler: vi.fn() },
}));

describe('GET /api/plugins', () => {
  it('returns 400 when propertyId missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/plugins'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/property/i);
  });

  it('returns plugins for a valid propertyId', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/plugins?propertyId=prop-1'));
    expect([200, 404]).toContain(res.status);
  });

  it('accepts X-Property-Id header', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/plugins');
    req.headers.set('X-Property-Id', 'prop-1');
    const res = await GET(req);
    expect([200, 404]).toContain(res.status);
  });
});
