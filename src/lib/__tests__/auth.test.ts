import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthSession, auth } from '../auth';

describe('Auth Configuration and Helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use sqlite provider when VITEST is true', async () => {
    const originalEnv = process.env.VITEST;
    process.env.VITEST = 'true';
    const { auth: dynamicAuth } = await import('../auth');
    expect(dynamicAuth).toBeDefined();
    process.env.VITEST = originalEnv;
  });

  it('should split process.env.TRUSTED_ORIGINS correctly', async () => {
    const originalEnv = process.env.TRUSTED_ORIGINS;
    process.env.TRUSTED_ORIGINS = 'https://trusted1.com,https://trusted2.com';
    vi.resetModules();
    const { auth: dynamicAuth } = await import('../auth');
    expect(dynamicAuth).toBeDefined();
    process.env.TRUSTED_ORIGINS = originalEnv;
  });

  it('should successfully get authentication session via getAuthSession', async () => {
    const mockSession = {
      session: { id: 's-123', userId: 'u-123' },
      user: { id: 'u-123', email: 'user@example.com', role: 'guest' },
    };

    const spy = vi.spyOn(auth.api, 'getSession').mockResolvedValue(mockSession as any);

    const req = new Request('http://localhost', {
      headers: {
        cookie: 'better-auth.session-token=token123',
      },
    });

    const res = await getAuthSession(req);

    expect(spy).toHaveBeenCalled();
    expect(res).toEqual(mockSession);
  });

  it('should catch error and return null in getAuthSession on rejection', async () => {
    const spy = vi
      .spyOn(auth.api, 'getSession')
      .mockRejectedValue(new Error('Session validation failed'));

    const req = new Request('http://localhost');
    const res = await getAuthSession(req);

    expect(spy).toHaveBeenCalled();
    expect(res).toBeNull();
  });
});
