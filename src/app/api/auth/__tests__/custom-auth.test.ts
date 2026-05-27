import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSignInEmail = vi.fn();
const mockGetSession = vi.fn();
const mockPrepare = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signInEmail: mockSignInEmail,
      getSession: mockGetSession,
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getLoginRoute() {
  const { POST } = await import('../login/route');
  return { POST };
}

async function getMeRoute() {
  const { GET } = await import('../me/route');
  return { GET };
}

describe('Custom Auth Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email or password is missing', async () => {
      const { POST } = await getLoginRoute();
      const res = await POST(
        new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('returns 401 on Better-Auth login failure', async () => {
      mockSignInEmail.mockRejectedValue(new Error('Invalid password'));
      const { POST } = await getLoginRoute();
      const res = await POST(
        new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
        })
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid credentials');
    });

    it('returns 200 with token and role/listing context on success', async () => {
      mockSignInEmail.mockResolvedValue({
        token: 'session-token-123',
        user: { id: 'u-1', email: 'test@example.com', name: 'Test User' },
      });

      mockPrepare.mockImplementation((sql: string) => {
        if (sql.includes('user_roles')) {
          return {
            get: () => ({
              role: 'marketplace_manager',
              permissions: JSON.stringify(['access_dashboard', 'edit_listing']),
            }),
          };
        }
        if (sql.includes('property_staff')) {
          return {
            all: () => [{ property_id: 'prop-1' }, { property_id: 'prop-2' }],
          };
        }
        return { get: () => null, all: () => [] };
      });

      const { POST } = await getLoginRoute();
      const res = await POST(
        new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'correct' }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBe('session-token-123');
      expect(body.user.name).toBe('Test User');
      expect(body.role).toBe('marketplace_manager');
      expect(body.permissions).toContain('edit_listing');
      expect(body.listing_ids).toContain('prop-1');
      expect(body.listing_ids).toContain('prop-2');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when there is no active session', async () => {
      mockGetSession.mockResolvedValue(null);
      const { GET } = await getMeRoute();
      const res = await GET(new NextRequest('http://localhost/api/auth/me'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Unauthorized');
    });

    it('returns 200 with user profile details when session is valid', async () => {
      mockGetSession.mockResolvedValue({
        session: { token: 'active-token-abc' },
        user: { id: 'u-2', email: 'me@example.com', role: 'staff' },
      });

      mockPrepare.mockImplementation((sql: string) => {
        if (sql.includes('sessions')) {
          return {
            get: () => ({
              user_id: 'u-2',
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            }),
          };
        }
        if (sql.includes('users')) {
          return {
            get: () => ({
              id: 'u-2',
              email: 'me@example.com',
              name: 'Me',
              image: null,
              role: 'staff',
            }),
          };
        }
        if (sql.includes('user_roles')) {
          return {
            get: () => ({
              role: 'staff',
              permissions: JSON.stringify(['view_listings']),
            }),
          };
        }
        if (sql.includes('property_staff')) {
          return {
            all: () => [{ property_id: 'prop-staff-1' }],
          };
        }
        return { get: () => null, all: () => [] };
      });

      const { GET } = await getMeRoute();
      const res = await GET(
        new NextRequest('http://localhost/api/auth/me', {
          headers: { Authorization: 'Bearer active-token-abc' },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBe('active-token-abc');
      expect(body.user.email).toBe('me@example.com');
      expect(body.role).toBe('staff');
      expect(body.permissions).toContain('view_listings');
      expect(body.listing_ids).toContain('prop-staff-1');
    });
  });
});
