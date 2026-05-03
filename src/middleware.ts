import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { locales } from "@/i18n/request";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "campops.com").toLowerCase();
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// Route path prefixes (after stripping locale segment) that require a logged-in session
const AUTH_REQUIRED = ["/owner", "/admin", "/guest"];
// Route path prefixes only accessible on premium (subdomain/custom_domain) plans
const PREMIUM_ONLY = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("x-forwarded-host") ?? req.nextUrl.hostname;
  const cleanHostname = hostname.split(":")[0].toLowerCase();

  // ── 1. Tenant resolution from hostname ──────────────────────────────────
  let tenantPropertyId: string | null = null;
  let tenantPlan: string | null = null;

  const isSubdomain =
    cleanHostname !== BASE_DOMAIN &&
    cleanHostname !== `www.${BASE_DOMAIN}` &&
    cleanHostname.endsWith(`.${BASE_DOMAIN}`);

  const isCustomDomain =
    !isSubdomain &&
    !cleanHostname.includes("localhost") &&
    !cleanHostname.includes("127.0.0.1") &&
    cleanHostname !== BASE_DOMAIN &&
    cleanHostname !== `www.${BASE_DOMAIN}`;

  if (isSubdomain || isCustomDomain) {
    try {
      const res = await fetch(
        `${API_URL}/api/tenant/resolve?host=${encodeURIComponent(cleanHostname)}`,
        { next: { revalidate: 60 } },
      );
      if (res.ok) {
        const data = await res.json();
        tenantPropertyId = data.property?.id ?? null;
        tenantPlan = data.property?.plan ?? null;
      }
    } catch {
      // Fail open — don't block the request if the API is unreachable
    }
  }

  // ── 2. Strip locale prefix to get the bare path ──────────────────────────
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  const barePath = localeMatch ? pathname.slice(localeMatch[0].length - 1) || "/" : pathname;
  const locale = localeMatch?.[1] ?? "en";

  // ── 3. Auth guard ────────────────────────────────────────────────────────
  const needsAuth = AUTH_REQUIRED.some((p) => barePath.startsWith(p));
  const token = req.cookies.get("campops_token")?.value;

  if (needsAuth && !token) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Plan guard: basic plan owners cannot reach /admin ─────────────────
  const isPremiumRoute = PREMIUM_ONLY.some((p) => barePath.startsWith(p));
  if (isPremiumRoute && tenantPlan === "basic") {
    return NextResponse.redirect(new URL(`/${locale}/owner/dashboard`, req.url));
  }

  // ── 5. Run intl middleware and attach tenant headers ─────────────────────
  const response = intlMiddleware(req);
  const next = response instanceof NextResponse ? response : NextResponse.next();

  if (tenantPropertyId) {
    next.headers.set("x-tenant-property-id", tenantPropertyId);
    next.headers.set("x-tenant-plan", tenantPlan ?? "basic");
  }

  return next;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
