/**
 * API Smoke Tests
 * ===============
 * Tests every API endpoint category for:
 *  - Correct response shape on happy path
 *  - Auth enforcement (unauthenticated requests get 401/403)
 *  - Input validation (missing required params get 400)
 *  - Error handling (DB failures return 500 with JSON)
 *
 * These tests use the real in-memory SQLite DB (NODE_ENV=test).
 * No external services are required.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Shared auth mock ────────────────────────────────────────────────────────

const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: {
    api: { getSession: mockGetSession },
    handler: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function req(url: string, opts: Record<string, unknown> = {}) {
  return new NextRequest(url, opts as any);
}

async function json(res: Response) {
  return res.json();
}

// ─── 1. Public API (no auth required) ────────────────────────────────────────

describe('Public API — no auth required', () => {
  it('GET /api/health → 200 with status:ok', async () => {
    const { GET } = await import('@/app/api/health/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toMatch(/ok|degraded/);
    expect(typeof body.uptime).toBe('number');
  });

  it('GET /api/public/search → 200 with properties array', async () => {
    const { GET } = await import('@/app/api/public/search/route');
    const res = await GET(req('http://localhost/api/public/search'));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.properties)).toBe(true);
    expect(typeof body.totalCount).toBe('number');
  });

  it('GET /api/public/search?destination=xyz → 200', async () => {
    const { GET } = await import('@/app/api/public/search/route');
    const res = await GET(req('http://localhost/api/public/search?destination=xyz'));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.properties)).toBe(true);
  });

  it('GET /api/branding (no params) → 400', async () => {
    const { GET } = await import('@/app/api/branding/route');
    const res = await GET(req('http://localhost/api/branding'));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/required/i);
  });

  it('GET /api/branding?slug=nonexistent → 404', async () => {
    const { GET } = await import('@/app/api/branding/route');
    const res = await GET(req('http://localhost/api/branding?slug=nonexistent-slug-xyz'));
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── 2. Auth-enforced manage routes ──────────────────────────────────────────

describe('Manage API — auth enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it('POST /api/manage/[listingId]/plugins/toggle → 401 without session', async () => {
    const { POST } = await import('@/app/api/manage/[listingId]/plugins/toggle/route');
    const res = await POST(
      req('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginName: 'booking', isEnabled: true }),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('POST /api/manage/[listingId]/plugins/toggle → 400 missing pluginName', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { POST } = await import('@/app/api/manage/[listingId]/plugins/toggle/route');
    const res = await POST(
      req('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/required/i);
  });

  it('POST /api/manage/[listingId]/plugins/toggle → 200 when authenticated', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { POST } = await import('@/app/api/manage/[listingId]/plugins/toggle/route');
    const res = await POST(
      req('http://localhost/api/manage/prop-1/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginName: 'booking', isEnabled: true }),
      }),
      { params: { listingId: 'prop-1' } }
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.pluginName).toBe('booking');
    expect(body.isEnabled).toBe(true);
  });
});

// ─── 3. Plugin catch-all route ────────────────────────────────────────────────

describe('Plugin catch-all /api/p/[...plugin]', () => {
  beforeEach(() => vi.resetModules());

  it('GET /api/p/nonexistent → 404 JSON error envelope', async () => {
    vi.doMock('@/lib/PluginRuntimeService', () => ({
      PluginRuntimeService: { init: vi.fn().mockResolvedValue(undefined) },
    }));
    vi.doMock('@/lib/PluginRouteRegistry', () => ({
      pluginRouteRegistry: { get: vi.fn().mockReturnValue(null) },
    }));
    const { GET } = await import('@/app/api/p/[...plugin]/route');
    const res = await GET(req('http://localhost/api/p/nonexistent'), {
      params: { plugin: ['nonexistent'] },
    });
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ─── 4. Master API — auth enforcement ────────────────────────────────────────

describe('Master API — auth enforcement', () => {
  it('GET /api/master/listings returns JSON array (integration with DB)', async () => {
    const { GET } = await import('@/app/api/master/listings/route');
    const res = await GET(req('http://localhost/api/master/listings'));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.listings)).toBe(true);
  });

  it('GET /api/master/stats returns numeric fields', async () => {
    const { GET } = await import('@/app/api/master/stats/route');
    const res = await GET(req('http://localhost/api/master/stats?adminId=master-admin'));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(typeof body.totalTenants).toBe('number');
    expect(typeof body.totalUsers).toBe('number');
  });

  it('GET /api/master/stats → 403 without adminId', async () => {
    const { GET } = await import('@/app/api/master/stats/route');
    const res = await GET(req('http://localhost/api/master/stats'));
    expect(res.status).toBe(403);
  });
});

// ─── 5. Error shape conformance ───────────────────────────────────────────────

describe('Error shape conformance', () => {
  it('404 responses have JSON error body', async () => {
    const { GET } = await import('@/app/api/branding/route');
    const res = await GET(req('http://localhost/api/branding?slug=nonexistent-xyz-404'));
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(typeof body.error).toBe('string');
  });

  it('400 responses have JSON error body', async () => {
    const { GET } = await import('@/app/api/branding/route');
    const res = await GET(req('http://localhost/api/branding'));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(typeof body.error).toBe('string');
  });
});

// ─── 6. Rate limiter smoke ────────────────────────────────────────────────────

describe('RateLimiter', () => {
  it('allows requests under limit', async () => {
    const { RateLimiter } = await import('@/lib/rateLimit');
    const limiter = new RateLimiter(5, 10_000);
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('test-key');
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('throws RateLimitError when limit exceeded', async () => {
    const { RateLimiter } = await import('@/lib/rateLimit');
    const { RateLimitError } = await import('@/lib/errors');
    const limiter = new RateLimiter(2, 10_000);
    limiter.check('key');
    limiter.check('key');
    expect(() => limiter.check('key')).toThrow(RateLimitError);
  });

  it('resets window after expiry', async () => {
    const { RateLimiter } = await import('@/lib/rateLimit');
    const limiter = new RateLimiter(1, 1); // 1ms window
    limiter.check('key');
    await new Promise((r) => setTimeout(r, 5));
    const result = limiter.check('key');
    expect(result.remaining).toBe(0);
  });

  it('cleanup removes expired entries', async () => {
    const { RateLimiter } = await import('@/lib/rateLimit');
    const limiter = new RateLimiter(10, 1); // 1ms window
    limiter.check('key-1');
    limiter.check('key-2');
    expect(limiter.size).toBe(2);
    await new Promise((r) => setTimeout(r, 5));
    limiter.cleanup();
    expect(limiter.size).toBe(0);
  });
});

// ─── 7. errorResponse helper ─────────────────────────────────────────────────

describe('errorResponse utility', () => {
  it('formats AppError subclasses correctly', async () => {
    const { errorResponse, ValidationError, AuthError, NotFoundError, ForbiddenError } =
      await import('@/lib/errors');

    const cases = [
      {
        err: new ValidationError('Bad input', { field: 'email' }),
        status: 400,
        code: 'VALIDATION_ERROR',
      },
      { err: new AuthError(), status: 401, code: 'AUTH_ERROR' },
      { err: new ForbiddenError(), status: 403, code: 'FORBIDDEN' },
      { err: new NotFoundError('Missing'), status: 404, code: 'NOT_FOUND' },
    ];

    for (const { err, status, code } of cases) {
      const res = errorResponse(err);
      expect(res.status).toBe(status);
      const body = await res.json();
      expect(body.error.code).toBe(code);
    }
  });

  it('treats unknown errors as 500', async () => {
    const { errorResponse } = await import('@/lib/errors');
    const res = errorResponse(new Error('Unexpected'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('handles non-Error thrown values', async () => {
    const { errorResponse } = await import('@/lib/errors');
    const res = errorResponse('string error');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
