import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { requireSession, requireRole, requireListingAccess, isErrorResponse } from '../auth-middleware';
import { auth } from '../auth';
import { db } from '../db';

function mockGetSession(result: any) {
  return vi.spyOn(auth.api, 'getSession').mockResolvedValue(result as any);
}

function makePrepareMock(result: any) {
  return vi.spyOn(db, 'prepare').mockReturnValue({
    get: vi.fn().mockReturnValue(result),
    all: vi.fn().mockReturnValue([]),
    run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: null }),
  } as any);
}

describe('auth-middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('requireSession', () => {
    it('returns mock session in test env', async () => {
      const req = new Request('http://localhost');
      const result = await requireSession(req);
      expect(result).toEqual({
        user: { id: 'test-user', role: 'marketplace_master' },
        session: { id: 'test-session' },
      });
    });

    it('returns 401 when session is null', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession(null);
      const req = new Request('http://localhost');
      const result = await requireSession(req);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
      const body = await (result as NextResponse).json();
      expect(body.error).toBe('Unauthorized');
      vi.unstubAllEnvs();
    });

    it('returns 401 when getSession throws', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession(Promise.reject(new Error('fail')));
      const req = new Request('http://localhost');
      const result = await requireSession(req);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
      vi.unstubAllEnvs();
    });

    it('returns session when authenticated', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      const session = { user: { id: 'u1', role: 'manager' }, session: { id: 's1' } };
      mockGetSession(session);
      const req = new Request('http://localhost');
      const result = await requireSession(req);
      expect(result).toEqual(session);
      vi.unstubAllEnvs();
    });
  });

  describe('requireRole', () => {
    it('returns mock session in test env', async () => {
      const req = new Request('http://localhost');
      const result = await requireRole(req, ['manager']);
      expect(result).toEqual({
        user: { id: 'test-user', role: 'marketplace_master' },
        session: { id: 'test-session' },
      });
    });

    it('returns 403 when role not allowed', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'u1', role: 'guest' }, session: { id: 's1' } });
      const req = new Request('http://localhost');
      const result = await requireRole(req, ['manager', 'marketplace_master']);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      vi.unstubAllEnvs();
    });

    it('normalizes master to marketplace_master', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'u1', role: 'master' }, session: { id: 's1' } });
      const req = new Request('http://localhost');
      const result = await requireRole(req, ['marketplace_master']);
      expect(result).toEqual({ user: { id: 'u1', role: 'master' }, session: { id: 's1' } });
      vi.unstubAllEnvs();
    });

    it('forwards 401 when session is null', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession(null);
      const req = new Request('http://localhost');
      const result = await requireRole(req, ['manager']);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
      vi.unstubAllEnvs();
    });
  });

  describe('requireListingAccess', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns mock session in test env', async () => {
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'listing-1', ['manager']);
      expect(result).toEqual({
        user: { id: 'test-user', role: 'marketplace_master' },
        session: { id: 'test-session' },
      });
    });

    it('allows marketplace_master without ownership check', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'admin', role: 'marketplace_master' }, session: { id: 's1' } });
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'listing-1', ['manager']);
      expect(result).toEqual({ user: { id: 'admin', role: 'marketplace_master' }, session: { id: 's1' } });
      vi.unstubAllEnvs();
    });

    it('returns 403 when role not allowed', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'u1', role: 'guest' }, session: { id: 's1' } });
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'listing-1', ['manager']);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      vi.unstubAllEnvs();
    });

    it('returns 404 when listing not found', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'u1', role: 'manager' }, session: { id: 's1' } });
      makePrepareMock(undefined);
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'nonexistent', ['manager']);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(404);
      vi.unstubAllEnvs();
    });

    it('returns 403 when user is not the owner', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'u1', role: 'manager' }, session: { id: 's1' } });
      makePrepareMock({ owner_id: 'owner-other' });
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'listing-1', ['manager']);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      vi.unstubAllEnvs();
    });

    it('returns session when user is owner', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'owner-1', role: 'manager' }, session: { id: 's1' } });
      makePrepareMock({ owner_id: 'owner-1' });
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'listing-1', ['manager']);
      expect(result).toEqual({ user: { id: 'owner-1', role: 'manager' }, session: { id: 's1' } });
      vi.unstubAllEnvs();
    });

    it('looks up by post slug when property not found', async () => {
      vi.stubEnv('VITEST', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      mockGetSession({ user: { id: 'owner-1', role: 'manager' }, session: { id: 's1' } });
      const prepareMock = vi.fn()
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(undefined) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ post_slug: 'camp-slug' }) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ owner_id: 'owner-1' }) });
      vi.spyOn(db, 'prepare').mockImplementation(prepareMock);
      const req = new Request('http://localhost');
      const result = await requireListingAccess(req, 'post-uuid', ['manager']);
      expect(result).toEqual({ user: { id: 'owner-1', role: 'manager' }, session: { id: 's1' } });
      expect(prepareMock).toHaveBeenCalledTimes(3);
      vi.unstubAllEnvs();
    });
  });

  describe('isErrorResponse', () => {
    it('returns true for NextResponse', () => {
      expect(isErrorResponse(new NextResponse())).toBe(true);
    });

    it('returns false for non-NextResponse', () => {
      expect(isErrorResponse({})).toBe(false);
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse(undefined)).toBe(false);
    });
  });
});
