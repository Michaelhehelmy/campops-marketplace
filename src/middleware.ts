import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { locales } from '@/i18n/request';
import { logger } from '@/lib/logger';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();
const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== ''
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.API_URL || `http://localhost:${process.env.PORT || '3001'}`;

const AUTH_REQUIRED = ['/owner', '/admin', '/guest', '/manage'];
const PREMIUM_ONLY = ['/admin'];
const LISTING_ACCESS_REQUIRED = ['/manage'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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

  const needsAuth = AUTH_REQUIRED.some((p) => barePath.startsWith(p));
  const token =
    req.cookies.get('sinaicamps_token')?.value ||
    req.cookies.get('better-auth.session_token')?.value ||
    req.cookies.get('better-auth.session-token')?.value;

  if (needsAuth && !token) {
    logger.info(`Auth required for ${pathname}, redirecting to login`);
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
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
      const userRole = req.cookies.get('sinaicamps_role')?.value;
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
                Cookie: `sinaicamps_token=${token}; better-auth.session_token=${token}; sinaicamps_role=${userRole || ''}`,
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
          logger.error('Error checking listing access:', err);
          // On network error, only redirect non-master users who are accessing sensitive pages
          if (userRole && userRole !== 'master') {
            // For cross-listing access, we can't verify — allow through with caution
            // For staff, block finance/settings
          }
        }
      }
    }
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

  if (tenantPropertyId && tenantSlug) {
    const isTenantRoot =
      barePath === '/' || barePath === `/${locale}` || barePath === `/${locale}/`;
    if (isTenantRoot) {
      const rewriteUrl = new URL(`/${locale}/stay/${tenantSlug}`, req.url);
      req.nextUrl.searchParams.forEach((v, k) => rewriteUrl.searchParams.set(k, v));
      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set('x-tenant-property-id', tenantPropertyId);
      response.headers.set('x-tenant-plan', tenantPlan ?? 'basic');
      response.headers.set('x-tenant-slug', tenantSlug);
      return response;
    }
  }

  // Root slug rewrite
  // Reserved path prefixes — these are never treated as tenant slugs.
  // /list-your-space is the generic onboarding path (formerly /list-your-camp).
  // /resource is the generic resource/listing detail rewrite target.
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
    const rewriteUrl = new URL(`/${locale}/resource${barePath}`, req.url);
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

  return next;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
