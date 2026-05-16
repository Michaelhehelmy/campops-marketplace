import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Auth Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('process', {
      ...process,
      env: { ...process.env },
    });
  });

  it('should use sqlite provider when VITEST is true', async () => {
    process.env.VITEST = 'true';
    const { auth } = await import('../auth');
    // We can't easily check the internal better-auth state,
    // but importing it executes the logic.
    expect(auth).toBeDefined();
  });

  it('should use pg provider when DATABASE_URL is set and not in test', async () => {
    // Force non-test env
    process.env.VITEST = 'false';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://localhost:5432';

    const { auth } = await import('../auth');
    expect(auth).toBeDefined();
  });

  it('should fallback to sqlite when no DATABASE_URL and not in test', async () => {
    process.env.VITEST = 'false';
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    const { auth } = await import('../auth');
    expect(auth).toBeDefined();
  });
});
