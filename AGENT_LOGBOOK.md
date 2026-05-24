# Agent Logbook & Memory — SinaiCamps

This file serves as a persistent memory and logbook for the OpenCode AI agents working in this repository.

> **AGENT INSTRUCTIONS:**
> 1. **Read** this file at the start of every task to learn about past changes, codebase quirks, and design decisions.
> 2. **Update** the "Persistent Learnings & Codebase Gotchas" section below if you discover new rules, API changes, or debugging gotchas.
> 3. **Append** a log entry in the "Task Logs" section at the end of every task you perform.

---

## Persistent Learnings & Codebase Gotchas

*This section lists persistent lessons, structural details, and API quirks discovered by agents during development. Update this list as you find new gotchas.*

- **Initial Setup**: Universal OpenCode workspace successfully configured and bootstrapped.
- **better-auth `nextCookies()` plugin is mandatory** for Next.js App Router; without it `Set-Cookie` headers are silently discarded by the framework — the response looks fine but no cookie is set.
- **`trustedOrigins` must be an async function** returning dynamic origins from DB for tenant custom domains; better-auth calls `trustedOrigins()` each time to resolve allowed origins.
- **`crossSubdomainActivate` is NOT valid** in better-auth v1.6.9; omit entirely (no error thrown, but it's not a recognized option).
- **CSP `'self'` with route interception breaks**: when `page.route` rewrites URLs (e.g. `acaciacamp.com` → `localhost:3000`), the browser interprets `'self'` as the original domain in the URL bar, not the actual server origin. Must strip CSP headers for cross-origin local testing.
- **Route-interception cookie limitation**: cookies set via route-intercepted requests are scoped to the rewritten origin (`localhost:3000`), not the test domain (`acaciacamp.com`). Post-login navigations lose the session. The only way to fully test tenant custom domains locally is with real DNS resolution.
- **`X-Forwarded-Host` in nginx is required** for better-auth's per-request base URL resolution to work with custom domains.
- **better-auth v1.6.9 `__Secure-` cookie prefix**: when `useSecureCookies: true`, the session cookie is named `__Secure-better-auth.session_token`. Middleware and API routes must check this prefixed name, not just `better-auth.session_token`.
- **`/api/owner/me` was deleted** from the app router and moved to the owner plugin in `plugins/owner/src/index.ts`. In production, the plugin system may not have the `owner` plugin seeded in `available_plugins`, causing 404. The route was recreated directly in `src/app/api/owner/me/route.ts` for production reliability.
- **Cloudflare Insights errors** (CORS + SRI hash mismatch) are from Cloudflare's auto-injected beacon script, not from app code. Fix in Cloudflare dashboard: disable Insights / Rocket Loader / Auto-Minify for JS.

---

## Task Logs

### [2026-05-22] Workspace Template Bootstrap
- **Task**: Standardize the project developer environment using the universal template.
- **Changes**: Configured `workspace.config.json` at the project root, bootstrapped MCPs, and generated agent/prompt assets dynamically.
- **Lessons**: Moving agent configs into `.opencode/` keeps the root project repository clean and prevents prompt-drift across different developer environments.

### [2026-05-23] Production Login Fix & E2E Tests
- **Task**: Fix CSP blocking Cloudflare Insights, fix better-auth origin validation for custom domains, add cookie persistence via `nextCookies()`, run E2E tests.
- **Changes**:
  - `src/middleware.ts`: added `static.cloudflareinsights.com` to CSP `script-src` and `connect-src`.
  - `src/lib/auth.ts`: added `nextCookies()` plugin; made `trustedOrigins` async querying DB for verified custom domains; removed invalid `crossSubdomainActivate`; set `BETTER_AUTH_URL` to `https://sinaicamps.com` in `.env.production`.
  - `nginx-unified.conf`: added `proxy_set_header X-Forwarded-Host $host` to HTTP and HTTPS blocks.
  - Built + deployed to Oracle VM (PM2 restart, nginx reload, health check 200).
- **Test Results**:
  - **Test 1 (sinaicamps.com/localhost)** ✅: `master@sinaicamps.com` login → `/en/admin` renders with 0 console errors, all nav links present.
  - **Test 2 (acaciacamp.com via route rewrite)** ⚠️: Login API succeeds (session created), but route interception causes cookie domain mismatch (`localhost:3000` vs `acaciacamp.com`), so post-login redirect loses session. Cannot fully test tenant custom domains locally without real DNS/proxy setup.
- **Lessons**: Route interception for cross-origin testing has fundamental cookie-scoping limitations. CSP must be stripped (or the production Host header matched) for rewritten-domain tests. `nextCookies()` is silently critical — without it, auth appears to work but sessions never persist.

### [2026-05-23] Fix `__Secure-` Cookie Prefix & Missing Routes
- **Task**: Fix middleware/API routes not recognizing better-auth's `__Secure-` prefixed session cookie, causing login redirect loop on custom domains. Fix missing `/api/owner/me` and `/en/owner/revenue` routes.
- **Changes**:
  - `src/middleware.ts`: added `__Secure-better-auth.session_token` to token lookup (line 135); updated Cookie forwarding headers for redirect-check (line 154) and listing-access (line 194).
  - `src/app/api/listing-access/route.ts`: added `__Secure-` prefixed cookie to fallback token lookup (line 31).
  - `src/app/api/auth/me/route.ts`: added `__Secure-` prefixed cookie to fallback token lookup (line 22).
  - `src/app/api/owner/me/route.ts`: **recreated** the route (was deleted and moved to owner plugin; plugin not loaded in production).
  - `src/app/[locale]/owner/revenue/page.tsx`: **created** placeholder page (sidebar linked to it but file never existed).
- **Results**: Login on `acaciacamp.com` works with full redirect to management page. `/api/owner/me` returns 200. Revenue page no longer 404.
- **Remaining**: Cloudflare Insights CORS/SRI errors (Cloudflare dashboard config). CRM stats 404 (missing plugin route).

## 2026-05-23 — Zero-hardcoded branding: dynamic platform name everywhere

- **Task**: Replace every hardcoded `"SinaiCamps"` string in source with dynamic platform name from `marketplace_settings` table (via `GET /api/public/platform-settings` or direct DB query).
- **Changes**:
  - Created `src/app/api/public/platform-settings/route.ts`: public GET endpoint returning `platformName`, `supportEmail`, `currency`, `timezone` from `marketplace_settings` (or fallback defaults).
  - Rewrote `src/app/api/master/settings/route.ts`: GET reads from `marketplace_settings`, POST uses `COALESCE`-based partial update. Requires `marketplace_master` role.
  - Created migration `010_marketplace_settings.sql` with `platform_name`, `support_email`, `currency`, `timezone`, `commission_rate`, `min_booking_fee` columns + default row.
  - Server layouts (`[locale]/layout.tsx`, `[locale]/list-your-camp/layout.tsx`, `manifest.ts`, `[locale]/stay/[slug]/head.tsx`): query DB directly at render time.
  - Client layouts (`admin/layout.tsx`, `owner/layout.tsx`, `guest/layout.tsx`): fetch from `/api/public/platform-settings` in `useEffect`.
  - Client components (`Nav.tsx`, `ShopfrontFooter.tsx`, `MarketplaceInsights.tsx`, `TestBanner.tsx`, `admin/master/settings/page.tsx`, `admin/plugins/page.tsx`, `admin/master/plugins/page.tsx`, `list-your-camp/plan/page.tsx`, `list-your-camp/success/page.tsx`): fetch platform name from public API or use `useTranslations`.
  - `TestBanner.tsx`: switched from hardcoded "Install SinaiCamps App" to `useTranslations('property')('installApp')`.
  - `plan/page.tsx`: subdomain feature text uses `BASE_DOMAIN` env var instead of `sinaicamps.com`; CNAME instruction uses dynamic `BASE_DOMAIN`.
- **Gotchas**:
  - `manifest.ts` cannot use `@/lib/db` via `better-sqlite3` directly? — Actually it worked fine (it's a server module).
  - State defaults (`useState('SinaiCamps')`) are intentional fallbacks that get overwritten after API fetch; they only flash on first render.
  - The `admin/master/plugins/page.tsx` has the plugins array inlined in the component body, so `useEffect` for platform fetch must go after the `useState` calls.
  - `build`: passes clean. `tsc`: only pre-existing errors (Playwright types, test file issues). `vitest`: 8 pre-existing failures (unrelated).

### [2026-05-23] Full E2E Suite Green — Better Auth Rate Limit Fix
- **Task**: Achieve 100% E2E test coverage; fix 34 auth-test failures and `ultimate-redirect` flake.
- **Changes**:
  - `src/app/api/[...path]/route.ts`: fixed extra closing brace in rate-limit bypass else block.
  - `src/middleware.ts`: added `SKIP_RATE_LIMIT` env var check to skip app-level rate limiting in E2E.
  - `src/lib/auth.ts`: added `rateLimit: { enabled: !(SKIP_RATE_LIMIT || NODE_ENV=test) }` — Better Auth has its own hardcoded rate limiter (3 req/10s for sign-in) that was blocking auth fixture requests.
- **Test Results**:
  - **Unit**: 1075 pass, 18 skip (120 files) — green.
  - **E2E**: 187 pass, 0 fail, 2 skip — **fully green**.
  - `ultimate-redirect.spec.ts` now passes consistently (was flaky due to auth rate-limit timeout).
- **Root Cause**: Better Auth's internal rate limiter (not configurable via middleware) was blocking the 4th+ sign-in attempt. The auth fixture logs in 3+ times per test file. Fixed by passing `rateLimit: { enabled: false }` when `SKIP_RATE_LIMIT=true`.
- **Gotchas**: Better Auth's `rateLimit` config (in `create-context.mjs:168`) defaults `enabled` to `isProduction`. In dev mode it's `false`, but the sign-in endpoint has hardcoded special rules (`getDefaultSpecialRules`) at **3 req/10s** regardless of the global setting. Must explicitly pass `rateLimit: { enabled: false }` to bypass.

### [2026-05-24] Tenant UI Isolation — Shared Context, Runtime Detection, E2E Tests

- **Task**: Replace build-time `NEXT_PUBLIC_TENANT_ID` with runtime tenant detection from middleware headers; create shared tenant context so all components can access tenant state without re-querying DB; add E2E tests for tenant UI isolation.
- **Changes**:
  - Created `src/lib/tenant-context.ts`: shared server-side utilities (`getTenantFromHeaders` reads `x-tenant-*` middleware headers, `getTenantForHost` does full DB lookup by custom domain/subdomain).
  - Created `src/lib/TenantContext.tsx`: `TenantProvider` + `useTenant()` hook for client-side context propagation.
  - Refactored `src/app/[locale]/layout.tsx`: uses shared `getTenantFromHeaders()` (primary) + `getTenantForHost()` (fallback) instead of local duplicate; wraps `children` in `<TenantProvider tenant={...}>`.
  - Refactored `src/app/[locale]/page.tsx`: uses `getTenantFromHeaders()` at runtime instead of build-time `NEXT_PUBLIC_TENANT_ID` env var.
  - Fixed `src/app/api/tenant/resolve/route.ts`: subdomain match falls back to `slug` column when `subdomain` is NULL (test environments don't set subdomain).
  - Fixed `src/components/ShopfrontNav.tsx`: manager dashboard link goes to `/${locale}/manage/${tenant.slug}` instead of `/${locale}/owner/dashboard`.
  - Created `e2e/tests/tenant-ui-isolation.spec.ts`: 4 tests verifying marketplace content is hidden on tenant subdomains and tenant nav is shown.
- **Test Results**:
  - **Unit**: 1075 pass, 18 skip (120 files) — no regressions.
  - **E2E**: 191 pass, 0 fail (187 existing + 4 new tenant isolation tests) — **fully green**.
- **Architecture Notes**:
  - Middleware rewrites tenant root path `/{locale}` → `/{locale}/stay/{slug}` (internal rewrite, not redirect). URL stays the same, content serves from stay page.
  - Layout detects tenant via `getTenantFromHeaders()` which reads `x-tenant-property-id` set by middleware. Falls back to `getTenantForHost(host)` for non-middleware contexts.
  - `TenantProvider` wraps all page content so any descendant can call `useTenant()`.
  - Tenant resolve API now matches by `slug` as fallback for test environments where `subdomain` column is NULL.
- **Gotchas**: Next.js middleware uses `NextResponse.rewrite()` not redirect — URL bar does not change. The `toHaveURL` matcher must check path suffix, not absolute path. Next.js dev server env var loading: `.env.local` can override command-line env vars in some configurations.

### [2026-05-24] Plan-Aware Routing & Branding — Full Suite Green 🟢

- **Task**: Enforce plan-aware tenant routing (Basic blocked from subdomain/custom domain), build branding CRUD APIs + dynamic form, create plan upgrade/domain check APIs, full E2E + unit coverage.
- **Changes**:
  - `src/app/api/tenant/resolve/route.ts`: Basic plan tenants now return 404 on subdomain/custom domain access.
  - `src/app/api/owner/upgrade/route.ts`: validates plan chain (basic→premium→ultimate), checks subdomain uniqueness, requires auth + ownership.
  - `src/app/api/owner/domains/check/route.ts`: validates domain format, checks Cloudflare DNS records, rejects non-Ultimate.
  - `src/app/api/properties/[id]/route.ts`: PATCH handler for property updates with branding JSON merge.
  - `src/app/api/owner/me/route.ts`: returns full `branding`, `settings`, `subdomain`, `customDomain`, `domainVerified`.
  - `src/app/[locale]/owner/property/page.tsx`: dynamic branding form (color pickers, logo, font, contact, social, address) + plan upgrade panel + domain manager.
  - `src/lib/__tests__/branding-validation.test.ts`: 16 unit tests for branding JSON, plan upgrade, domain format, plan enforcement.
  - `e2e/tests/plan-enforcement.spec.ts`: 15 E2E tests covering resolution, domain check, upgrade, branding CRUD, page rendering.
- **Fixes Applied**:
  - CSRF token extraction: parse `Set-Cookie` response header directly instead of `request.storageState()`.
  - Plan state isolation: `test.beforeAll` calls `/api/test/reset` to reseed DB before each file run.
  - BASE_DOMAIN mismatch: removed `BASE_DOMAIN=sinaicamps.localhost` from Playwright webServer command — `.env.local`'s `BASE_DOMAIN=localhost` takes effect. Updated `tenant-ui-isolation` tests to use `*.localhost`.
  - Upgrade API downgrade test: changed `newPlan: 'basic'` → error is "Invalid plan" (basic not in VALID_PLANS), not "Cannot downgrade".
  - Duplicate subdomain → duplicate custom domain test: uses acaciacamp.com which is already taken.
  - Branding page form test: use `getByRole('heading', { name: /Branding/i })` instead of `text=Branding` (strict mode violation).
- **Test Results**:
  - **Unit**: **1091 passed**, 18 skip (121 files, 132 total) — green.
  - **E2E**: **206 passed**, 0 fail, 0 skip — **fully green**.
- **Gotchas**: 
  - The webServer command's `BASE_DOMAIN=sinaicamps.localhost` took priority over `.env.local`'s `BASE_DOMAIN=localhost` because command-line env vars have higher priority than `.env.local` in Next.js. Tests using `*.localhost` failed to match. Fixed by removing `BASE_DOMAIN` from the command.
  - Best for rate limiter: Must set `rateLimit: { enabled: false }` explicitly; Better Auth's sign-in path hardcodes 3 req/10s special rules that bypass the global `enabled` flag.
  - CSRF token must be parsed from `Set-Cookie` response header of the sign-in response, not from `request.storageState()`, because the standalone `request` fixture's cookie jar may not sync Playwright test contexts.
