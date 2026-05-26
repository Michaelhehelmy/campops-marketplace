import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales } from '@/i18n/request';
import { logger, runWithRequestId, getRequestId } from '@/lib/logger';
import { apiRateLimiter } from '@/lib/rateLimit';
import { httpRequestsTotal, httpDurationMs, csrfBlockedTotal } from '@/lib/metrics';
import { verifySignedValue } from '@/lib/cookie-signing';
import { initErrorTracking, captureError } from '@/lib/error-tracking';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

function withSecurityHeaders(res: Response | NextResponse, nonce?: string): NextResponse {
  const response = res as NextResponse;
  const isProd = process.env.NODE_ENV === 'production';
  const connectSrc = isProd
    ? 'https://*.sinaicamps.com'
    : 'https://*.sinaicamps.com http://localhost:3001 http://127.0.0.1:3001';

  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://static.cloudflareinsights.com`
    : `'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com`;

  response.headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: https:`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `frame-src 'self' https://challenges.cloudflare.com`,
      `connect-src 'self' https://static.cloudflareinsights.com ${connectSrc}`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ')
  );

  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== ''
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.API_URL || `http://localhost:${process.env.PORT || '3001'}`;

const AUTH_REQUIRED = ['/owner', '/admin', '/manage', '/admin/settings', '/admin/setup'];
const PREMIUM_ONLY = ['/admin'];
const LISTING_ACCESS_REQUIRED = ['/manage'];

async function handleMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  logger.info(
    `[Middleware] pathname: ${pathname}, hostname: ${req.headers.get('x-forwarded-host') ?? req.nextUrl.hostname}, url: ${req.url}`
  );

  // 1. Rate-limit all API prefixes before anything else (skip in dev/E2E).
  if (process.env.SKIP_RATE_LIMIT === 'true') {
    logger.info('[Middleware] Rate limiting disabled via SKIP_RATE_LIMIT env var');
  } else {
    const RATE_LIMITED_PREFIXES = [
      '/api/auth/',
      '/api/payments/',
      '/api/manage/',
      '/api/master/',
      '/api/owner/',
      '/api/admin/',
      '/api/site/',
      '/api/public/',
      '/api/plugins/submit',
      '/api/p/',
      '/api/tenant/',
    ];
    if (RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous';
      try {
        await apiRateLimiter.check(ip);
      } catch (err: any) {
        const retryAfter = err.details?.retryAfter ?? 60;
        const response = NextResponse.json(
          { error: 'Too many requests', code: 'RATE_LIMIT', retryAfter },
          { status: 429 }
        );
        response.headers.set('Retry-After', String(retryAfter));
        response.headers.set('X-RateLimit-Limit', String(apiRateLimiter.maxRequests));
        response.headers.set('X-RateLimit-Remaining', '0');
        return withSecurityHeaders(response);
      }
    }
  }

  // Immediately bypass internal Next.js static asset and API paths
  if (pathname.startsWith('/_next/') || pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const hostname = req.headers.get('x-forwarded-host') ?? req.nextUrl.hostname;
  const cleanHostname = hostname.split(':')[0].toLowerCase();

  let tenantPropertyId: string | null = null;
  let tenantPlan: string | null = null;
  let tenantSlug: string | null = null;

  const isSubdomain =
    cleanHostname !== BASE_DOMAIN &&
    cleanHostname !== `www.${BASE_DOMAIN}` &&
    cleanHostname.endsWith(`.${BASE_DOMAIN}`);

  const isCustomDomain =
    !isSubdomain &&
    cleanHostname !== BASE_DOMAIN &&
    cleanHostname !== `www.${BASE_DOMAIN}` &&
    (cleanHostname.includes('.') || cleanHostname === 'localhost' || cleanHostname === '127.0.0.1');

  if (isSubdomain || isCustomDomain) {
    try {
      const res = await fetch(
        `${API_URL}/api/tenant/resolve?host=${encodeURIComponent(cleanHostname)}`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) {
        const data = await res.json();
        tenantPropertyId = data.property?.id ?? null;
        tenantPlan = data.property?.plan ?? null;
        tenantSlug = data.property?.slug ?? null;
      }
    } catch {}
  }

  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  const barePath = localeMatch ? pathname.replace(/^\/[a-z]{2}/, '') || '/' : pathname;
  const locale = localeMatch?.[1] ?? 'en';

  // 2. Tenant domain routing: serve custom website pages for premium/ultimate,
  //    redirect basic-plan tenants to the main marketplace listing.
  const TENANT_SUBPAGES = ['/about', '/services', '/gallery', '/rooms', '/room-types', '/contact', '/book'];
  if (tenantPropertyId && tenantSlug) {
    const isTenantRoot = barePath === '/' || barePath === `/${locale}` || barePath === `/${locale}/`;
    const isTenantSubpage = TENANT_SUBPAGES.some((p) => barePath === p || barePath === `/${locale}${p}`);
    if (isTenantRoot || isTenantSubpage) {
      if (tenantPlan === 'basic') {
        const scheme = req.headers.get('x-forwarded-proto') || 'https';
        const port = req.nextUrl.port;
        const hostWithPort = port ? `${BASE_DOMAIN}:${port}` : BASE_DOMAIN;
        const redirectUrl = `${scheme}://${hostWithPort}/${locale}/stay/${tenantSlug}`;
        logger.info(`[Tenant] Basic plan redirect to main domain: ${redirectUrl}`);
        return NextResponse.redirect(redirectUrl, 302);
      }
      const rewriteUrl = req.nextUrl.clone();
      if (isTenantRoot) {
        rewriteUrl.pathname = `/${locale}/${tenantSlug}`;
      } else {
        rewriteUrl.pathname = `/${locale}/${tenantSlug}${barePath}`;
      }
      logger.info(`[Tenant] Rewriting to tenant website: ${rewriteUrl.toString()}`);
      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set('x-tenant-property-id', tenantPropertyId);
      response.headers.set('x-tenant-plan', tenantPlan ?? 'basic');
      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('X-Next-Intl-Locale', locale);
      response.headers.set('x-next-intl-locale', locale);
      return response;
    }
  }

  const needsAuth = AUTH_REQUIRED.some((p) => barePath.startsWith(p));
  const token =
    req.cookies.get('sinaicamps_token')?.value ||
    req.cookies.get('__Secure-better-auth.session_token')?.value ||
    req.cookies.get('better-auth.session_token')?.value ||
    req.cookies.get('better-auth.session-token')?.value;

  if (needsAuth && !token) {
    logger.info(`Auth required for ${pathname}, redirecting to login`);
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Backup: Redirect ultimate-tier users accessing central dashboards on main domain.
  // Only enabled in production — in local dev, custom domain entries in /etc/hosts
  // should serve the tenant page without redirecting to the production URL.
  const isMainDomain = cleanHostname === BASE_DOMAIN || cleanHostname === `www.${BASE_DOMAIN}`;
  if (process.env.NODE_ENV === 'production' && needsAuth && token && isMainDomain) {
    try {
      const redirectRes = await fetch(`${API_URL}/api/auth/redirect-check`, {
        headers: {
          Cookie: `__Secure-better-auth.session_token=${token}; better-auth.session_token=${token}; better-auth.session-token=${token}; sinaicamps_token=${token}; sinaicamps_role=${req.cookies.get('sinaicamps_role')?.value || ''}`,
        },
      });
      if (redirectRes.ok) {
        const redirectData = await redirectRes.json();
        if (redirectData.redirect && redirectData.url) {
          logger.info(`Middleware redirecting ultimate user to custom domain: ${redirectData.url}`);
          return NextResponse.redirect(new URL(redirectData.url, req.url));
        }
      }
    } catch (err) {
      captureError(err as Error, { pathname, hostname: cleanHostname });
    }
  }

  const isPremiumRoute = PREMIUM_ONLY.some((p) => barePath.startsWith(p));
  if (isPremiumRoute && tenantPlan === 'basic') {
    return NextResponse.redirect(new URL(`/${locale}/owner/dashboard`, req.url));
  }

  const needsListingAccess = LISTING_ACCESS_REQUIRED.some((p) => barePath.startsWith(p));
  if (needsListingAccess && token) {
    const pathParts = barePath.split('/');
    if (pathParts.length >= 3) {
      const listingSlug = pathParts[2];
      const rawRoleCookie = req.cookies.get('sinaicamps_role')?.value;
      const userRole = rawRoleCookie ? verifySignedValue(rawRoleCookie) : undefined;
      // Staff restrictions on their own listing (done before external check)
      if (userRole === 'staff') {
        const restricted = ['/finance', '/settings', '/plugins'];
        if (restricted.some((r) => barePath.includes(r))) {
          logger.warn(`Staff access denied for ${barePath}`);
          return NextResponse.redirect(new URL(`/${locale}/unauthorized`, req.url));
        }
      }
      if (userRole !== 'master' && !tenantPropertyId) {
        try {
          const res = await fetch(
            `${API_URL}/api/listing-access?listing=${encodeURIComponent(listingSlug)}`,
            {
              headers: {
                Cookie: `sinaicamps_token=${token}; __Secure-better-auth.session_token=${token}; better-auth.session_token=${token}; sinaicamps_role=${userRole || ''}`,
              },
            }
          );
          if (!res.ok) return NextResponse.redirect(new URL(`/${locale}/owner/dashboard`, req.url));

          const data = await res.json();
          const role = data.role;

          // Staff restrictions: cannot access finance, settings, or plugins
          if (role === 'staff') {
            const restricted = ['/finance', '/settings', '/plugins'];
            if (restricted.some((r) => barePath.includes(r))) {
              logger.warn(`Staff access denied for ${barePath}`);
              return NextResponse.redirect(new URL(`/${locale}/manage/${listingSlug}`, req.url));
            }
          }
        } catch (err) {
          captureError(err as Error, { pathname, listingSlug });
          // On network error, only redirect non-master users who are accessing sensitive pages
          if (userRole && userRole !== 'master') {
            // For cross-listing access, we can't verify — allow through with caution
            // For staff, block finance/settings
          }
        }
      }
    }
  }

  if (tenantPropertyId && barePath.startsWith('/admin')) {
    const port = req.nextUrl.port;
    const hostWithPort = port ? `${BASE_DOMAIN}:${port}` : BASE_DOMAIN;
    const mainDomainUrl = new URL(pathname, `${req.nextUrl.protocol}//${hostWithPort}`);
    req.nextUrl.searchParams.forEach((v, k) => mainDomainUrl.searchParams.set(k, v));
    logger.info(
      `[Middleware] Redirecting platform admin route from tenant domain to main domain: ${mainDomainUrl.toString()}`
    );
    return NextResponse.redirect(mainDomainUrl);
  }

  if (tenantPlan === 'basic' && barePath.startsWith('/manage')) {
    const basicRestricted = ['/rooms', '/guests', '/finance', '/settings', '/plugins'];
    if (basicRestricted.some((r) => barePath.includes(r))) {
      const pathParts = barePath.split('/');
      const listingSlug = pathParts[2];
      const redirectUrl = new URL(`/${locale}/manage/${listingSlug || ''}`, req.url);
      redirectUrl.searchParams.set('flash', 'upgrade-premium');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Root slug rewrite
  // Reserved path prefixes — these are never treated as tenant slugs.
  // /list-your-space is the generic onboarding path (formerly /list-your-camp).
  const RESERVED_PREFIXES = [
    '/admin',
    '/guest',
    '/owner',
    '/manage',
    '/search',
    '/book',
    '/login',
    '/list-your-space',
    '/list-your-camp',
    '/resource',
    '/stay',
    '/unauthorized',
    '/offline',
    '/api',
    '/_next',
    '/pwa-preview',
  ];
  const isReserved = RESERVED_PREFIXES.some((p) => barePath.startsWith(p));

  if (barePath === '/signup') {
    return NextResponse.redirect(new URL(`/${locale}/list-your-camp`, req.url));
  }

  if (!isReserved && barePath !== '/' && !barePath.includes('.')) {
    // Rewrite short slug paths to the generic resource detail page.
    // Previously hard-coded as /stay; now uses /resource for vertical-agnostic routing.
    const rewriteUrl = new URL(`/${locale}/stay${barePath}`, req.url);
    req.nextUrl.searchParams.forEach((v, k) => rewriteUrl.searchParams.set(k, v));
    return NextResponse.rewrite(rewriteUrl);
  }

  const response = intlMiddleware(req);
  const next = response instanceof NextResponse ? response : NextResponse.next();

  if (tenantPropertyId) {
    next.headers.set('x-tenant-property-id', tenantPropertyId);
    next.headers.set('x-tenant-plan', tenantPlan ?? 'basic');
    if (tenantSlug) {
      next.headers.set('x-tenant-slug', tenantSlug);
    }
  }

  // RequestContext bootstrap headers — read by withRequestContext() in route handlers.
  // x-site-id is set for all resolved tenants; x-main-domain flags non-tenant requests.
  if (tenantPropertyId) {
    next.headers.set('x-site-id', tenantPropertyId);
    next.headers.set('x-site-slug', tenantSlug ?? '');
    next.headers.set('x-site-plan', tenantPlan ?? 'basic');
    next.headers.set('x-main-domain', '0');
  } else if (isMainDomain) {
    next.headers.set('x-main-domain', '1');
  }

  return next;
}

export async function middleware(req: NextRequest) {
  const requestId = globalThis.crypto.randomUUID();
  const startTime = Date.now();
  return runWithRequestId(requestId, async () => {
    const { pathname } = req.nextUrl;
    const method = req.method;

    const pathKey = pathname.split('/').slice(0, 3).join('/');
    httpRequestsTotal.inc({ method, status: '', path: pathKey });

    initErrorTracking();

    // CSRF Double-Submit Token Pattern Validation
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const isApi = pathname.startsWith('/api/');

    if (isApi && isMutating) {
      httpRequestsTotal.inc({ method: 'MUTATE', status: '', path: pathKey });
    }
    const isExcluded =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/test/') ||
      pathname.startsWith('/api/test-probe/') ||
      pathname === '/api/payments/connect' ||
      pathname === '/api/csrf-token';

    let csrfCookie = req.cookies.get('x-csrf-token')?.value;

    // Only validate CSRF when a cookie already exists.
    // If no cookie yet (first request from a new/anonymous visitor), skip
    // validation and let the response set the cookie. Subsequent mutating
    // requests must include the x-csrf-token header matching the cookie.
    if (isApi && isMutating && !isExcluded && csrfCookie) {
      const csrfHeader = req.headers.get('x-csrf-token') || req.headers.get('X-CSRF-Token');
      if (!csrfHeader || csrfCookie !== csrfHeader) {
        logger.warn(
          `[CSRF] Blocked mutating request to ${pathname}. Cookie: ${csrfCookie}, Header: ${csrfHeader}`
        );
        csrfBlockedTotal.inc();
        return withSecurityHeaders(
          NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 })
        );
      }
    }

    const res = await handleMiddleware(req);
    const response = res || NextResponse.next();

    // If x-csrf-token cookie doesn't exist, generate and set it
    if (!csrfCookie) {
      const token = globalThis.crypto.randomUUID();
      response.cookies.set('x-csrf-token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    const duration = Date.now() - startTime;
    const statusCode = response.status;
    httpRequestsTotal.inc({ method, status: String(statusCode), path: pathKey });
    httpDurationMs.observe({ method, status: String(statusCode), path: pathKey }, duration);
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-response-time', `${duration}ms`);

    return withSecurityHeaders(response);
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icon.png|favicon.ico|sinaicamps.png|sw.js|sw-tenant.js|sw-marketplace.js|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
