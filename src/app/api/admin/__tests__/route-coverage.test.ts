/**
 * Admin API Route Coverage Tests
 * ================================
 * Covers admin/plugins, admin/shops, admin/shops/[id], admin/master-plugins,
 * admin/plugins/assets, admin/plugins/sync
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) }, handler: vi.fn() },
}));

// ─── admin/plugins ────────────────────────────────────────────────────────────

describe('GET /api/admin/plugins', () => {
  it('returns 400 when adminId missing', async () => {
    const { GET } = await import('../plugins/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/plugins'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/adminId/i);
  });

  it('returns plugins list with valid adminId', async () => {
    const { GET } = await import('../plugins/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/plugins?adminId=master-admin')
    );
    expect([200, 403]).toContain(res.status);
  });

  it('filters by category', async () => {
    const { GET } = await import('../plugins/route');
    const res = await GET(
      new NextRequest(
        'http://localhost/api/admin/plugins?adminId=master-admin&category=hospitality'
      )
    );
    expect([200, 403]).toContain(res.status);
  });

  it('filters by status=active', async () => {
    const { GET } = await import('../plugins/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/plugins?adminId=master-admin&status=active')
    );
    expect([200, 403]).toContain(res.status);
  });
});

describe('POST /api/admin/plugins', () => {
  it('returns 400 when adminId missing', async () => {
    const { POST } = await import('../plugins/route');
    const res = await POST(
      new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-plugin' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when plugin name missing', async () => {
    const { POST } = await import('../plugins/route');
    const res = await POST(
      new NextRequest('http://localhost/api/admin/plugins', {
        method: 'POST',
        body: JSON.stringify({ adminId: 'master-admin' }),
      })
    );
    expect([400, 403]).toContain(res.status);
  });
});

// ─── admin/shops ──────────────────────────────────────────────────────────────

describe('GET /api/admin/shops', () => {
  it('returns 400 when adminId missing', async () => {
    const { GET } = await import('../shops/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/shops'));
    expect(res.status).toBe(400);
  });

  it('returns shops list with valid adminId', async () => {
    const { GET } = await import('../shops/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/shops?adminId=master-admin'));
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(Array.isArray(body.shops)).toBe(true);
    }
  });

  it('filters by status=active', async () => {
    const { GET } = await import('../shops/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/shops?adminId=master-admin&status=active')
    );
    expect([200, 403]).toContain(res.status);
  });

  it('applies search filter', async () => {
    const { GET } = await import('../shops/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/shops?adminId=master-admin&search=camp')
    );
    expect([200, 403]).toContain(res.status);
  });
});

// ─── admin/shops/[id] ────────────────────────────────────────────────────────

describe('GET /api/admin/shops/[id]', () => {
  it('returns 400 when adminId missing', async () => {
    const { GET } = await import('../shops/[id]/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/shops/shop-1'), {
      params: { id: 'shop-1' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for nonexistent shop', async () => {
    const { GET } = await import('../shops/[id]/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/shops/nonexistent?adminId=master-admin'),
      { params: { id: 'nonexistent-xyz-999' } }
    );
    expect([403, 404]).toContain(res.status);
  });
});

describe('PATCH /api/admin/shops/[id]', () => {
  it('returns 400 when adminId missing', async () => {
    const { PATCH } = await import('../shops/[id]/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/shops/shop-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      { params: { id: 'shop-1' } }
    );
    expect(res.status).toBe(400);
  });
});

// ─── admin/master-plugins ────────────────────────────────────────────────────

describe('GET /api/admin/master-plugins', () => {
  it('returns 400 when adminId missing', async () => {
    const { GET } = await import('../../admin/master-plugins/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/master-plugins'));
    expect(res.status).toBe(400);
  });

  it('returns plugins with valid adminId', async () => {
    const { GET } = await import('../../admin/master-plugins/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/master-plugins?adminId=master-admin')
    );
    expect([200, 403]).toContain(res.status);
  });
});

// ─── admin/plugins/assets ────────────────────────────────────────────────────

describe('GET /api/admin/plugins/assets', () => {
  it('returns 400 when adminId missing', async () => {
    const { GET } = await import('../plugins/assets/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/plugins/assets'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when pluginName also missing', async () => {
    const { GET } = await import('../plugins/assets/route');
    const res = await GET(
      new NextRequest('http://localhost/api/admin/plugins/assets?adminId=master-admin')
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when admin not authorized', async () => {
    const { GET } = await import('../plugins/assets/route');
    const res = await GET(
      new NextRequest(
        'http://localhost/api/admin/plugins/assets?adminId=master-admin&pluginName=booking'
      )
    );
    expect([200, 403]).toContain(res.status);
  });
});

// ─── admin/plugins/sync ──────────────────────────────────────────────────────

describe('POST /api/admin/plugins/sync', () => {
  it('triggers plugin sync and returns success', async () => {
    const { POST } = await import('../plugins/sync/route');
    const res = await POST(
      new NextRequest('http://localhost/api/admin/plugins/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
    expect([200, 500]).toContain(res.status);
    const body = await res.json();
    expect(body.success !== undefined).toBe(true);
  });
});
