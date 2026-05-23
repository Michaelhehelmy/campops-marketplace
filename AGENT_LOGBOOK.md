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
