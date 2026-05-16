import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('middleware tenant rewrites', () => {
  const originalBaseDomain = process.env.BASE_DOMAIN;
  const originalPublicBaseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;

  beforeEach(() => {
    process.env.BASE_DOMAIN = 'sinaicamps.localhost';
    process.env.NEXT_PUBLIC_BASE_DOMAIN = 'sinaicamps.localhost';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ property: { id: 'prop-1', slug: 'safari-camp', plan: 'basic' } }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.BASE_DOMAIN = originalBaseDomain;
    process.env.NEXT_PUBLIC_BASE_DOMAIN = originalPublicBaseDomain;
  });

  it('rewrites the tenant root host to the white-labeled listing page', async () => {
    const req = new NextRequest('http://localhost/', {
      headers: { 'x-forwarded-host': 'safari-camp.sinaicamps.localhost' },
    });

    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/stay/safari-camp');
    expect(res.headers.get('x-tenant-property-id')).toBe('prop-1');
    expect(res.headers.get('x-tenant-plan')).toBe('basic');
    expect(res.headers.get('x-tenant-slug')).toBe('safari-camp');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('treats a localhost custom domain as a tenant host in tests', async () => {
    const req = new NextRequest('http://localhost/', {
      headers: { 'x-forwarded-host': 'theirown.localhost' },
    });

    const res = await middleware(req);

    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/stay/safari-camp');
    expect(res.headers.get('x-tenant-slug')).toBe('safari-camp');
  });

  it('redirects unauthenticated manage requests to login', async () => {
    const req = new NextRequest('http://localhost/en/manage/safari-camp/rooms', {
      headers: { 'x-forwarded-host': 'safari-camp.sinaicamps.localhost' },
    });

    const res = await middleware(req);

    expect(res.headers.get('location')).toContain(
      '/en/login?next=%2Fen%2Fmanage%2Fsafari-camp%2Frooms'
    );
  });

  it('redirects basic-tier admins away from restricted manage pages', async () => {
    const req = new NextRequest('http://localhost/en/manage/safari-camp/rooms', {
      headers: {
        'x-forwarded-host': 'safari-camp.sinaicamps.localhost',
        cookie: 'sinaicamps_token=test-token',
      },
    });

    const res = await middleware(req);

    expect(res.headers.get('location')).toContain('/en/manage/safari-camp?flash=upgrade-premium');
  });

  it('allows premium-tier admins to access restricted manage pages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) => {
        const href = String(url);
        if (href.includes('/api/tenant/resolve')) {
          return new Response(
            JSON.stringify({
              property: { id: 'prop-premium', slug: 'premium-camp', plan: 'premium' },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(JSON.stringify({ ok: true, role: 'master' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    const req = new NextRequest('http://localhost/en/manage/premium-camp/rooms', {
      headers: {
        'x-forwarded-host': 'premium-camp.sinaicamps.localhost',
        cookie: 'sinaicamps_token=test-token',
      },
    });

    const res = await middleware(req);

    expect(res.headers.get('location') ?? '').not.toContain('flash=upgrade-premium');
    expect(res.headers.get('x-tenant-plan')).toBe('premium');
    expect(res.headers.get('x-tenant-slug')).toBe('premium-camp');
  });
});
