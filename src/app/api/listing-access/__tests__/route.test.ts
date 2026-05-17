import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockPrepare = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getRoute() {
  const { GET } = await import('../route');
  return { GET };
}

describe('GET /api/listing-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 with no session and no cookies', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await getRoute();
    const res = await GET(new NextRequest('http://localhost/api/listing-access?listing=my-camp'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns 200 with role:master for master session', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'master-1', role: 'master' } });
    const { GET } = await getRoute();
    const res = await GET(new NextRequest('http://localhost/api/listing-access?listing=any-camp'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('master');
  });

  it('returns 200 with staff role when staff has access', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    mockPrepare.mockReturnValue({
      get: vi.fn().mockResolvedValue({ role: 'staff' }),
    });
    const { GET } = await getRoute();
    const res = await GET(new NextRequest('http://localhost/api/listing-access?listing=my-camp'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('staff');
  });

  it('returns 403 when staff has no access to the listing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    mockPrepare.mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
    });
    const { GET } = await getRoute();
    const res = await GET(
      new NextRequest('http://localhost/api/listing-access?listing=other-camp')
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/forbidden/i);
  });

  it('falls back to ok:true on DB error (resilience)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    mockPrepare.mockImplementation(() => {
      throw new Error('DB crash');
    });
    const { GET } = await getRoute();
    const res = await GET(new NextRequest('http://localhost/api/listing-access?listing=camp'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
