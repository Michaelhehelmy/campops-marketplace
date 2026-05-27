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
  const { POST } = await import('../route');
  return { POST };
}

describe('POST /api/manage/[listingId]/plugins/toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Mock db.prepare to support property lookup + upsert
    mockPrepare.mockImplementation(function (this: any, sql: string) {
      const get = vi.fn();
      const run = vi.fn().mockResolvedValue(undefined);
      if (sql.includes('SELECT id FROM properties')) {
        get.mockResolvedValue({ id: 'prop-1' });
      }
      return { get, run, all: vi.fn() };
    });
  });

  it('returns 400 when pluginName is missing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { POST } = await getRoute();
    const res = await POST(
      new NextRequest('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details.length).toBeGreaterThanOrEqual(1);
    expect(body.details[0].path).toContain('pluginName');
  });

  it('enables a plugin successfully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { POST } = await getRoute();
    const res = await POST(
      new NextRequest('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginName: 'crm', isEnabled: true }),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pluginName).toBe('crm');
    expect(body.isEnabled).toBe(true);
  });

  it('disables a plugin successfully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { POST } = await getRoute();
    const res = await POST(
      new NextRequest('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginName: 'crm', isEnabled: false }),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isEnabled).toBe(false);
  });

  it('returns 500 on database error', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('DB error');
    });
    const { POST } = await getRoute();
    const res = await POST(
      new NextRequest('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginName: 'booking', isEnabled: true }),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});
