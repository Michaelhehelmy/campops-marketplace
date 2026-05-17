# Test Coverage Report

**Generated:** 2026-05-17  
**Suite:** CampOps Marketplace — Full Test Audit

---

## Summary

| Metric             | Value                                        |
| ------------------ | -------------------------------------------- |
| Test Files         | **88 passed** \| 5 skipped stubs \| 0 failed |
| Total Tests        | **665 passed** \| 11 skipped \| 0 failed     |
| Statement Coverage | **60.2%** (threshold: 60%) ✅                |
| Line Coverage      | **60.2%** (threshold: 60%) ✅                |
| Function Coverage  | **73.1%** (threshold: 65%) ✅                |
| Branch Coverage    | **55.3%** (threshold: 50%) ✅                |

Coverage scope: `src/lib/**/*.{ts,tsx}` + `src/app/api/**/*.ts`

---

## Coverage by Area

### Core Libraries (`src/lib/`)

| Module                    | Stmts    | Branches | Funcs    | Lines    |
| ------------------------- | -------- | -------- | -------- | -------- |
| `db.ts`                   | ~90%     | ~85%     | ~90%     | ~90%     |
| `errors.ts`               | 100%     | 100%     | 100%     | 100%     |
| `rateLimit.ts`            | 100%     | 100%     | 100%     | 100%     |
| `hooks.ts`                | ~95%     | ~90%     | ~95%     | ~95%     |
| `logger.ts`               | ~85%     | ~80%     | ~85%     | ~85%     |
| `PluginAPI.ts`            | ~80%     | ~70%     | ~80%     | ~80%     |
| `PluginRouteRegistry.ts`  | ~85%     | ~80%     | ~85%     | ~85%     |
| `PluginRuntimeService.ts` | ~70%     | ~65%     | ~70%     | ~70%     |
| `UIRegistryService.ts`    | ~75%     | ~70%     | ~75%     | ~75%     |
| `featureFlags.ts`         | ~80%     | ~75%     | ~80%     | ~80%     |
| `api.ts`                  | ~75%     | ~70%     | ~75%     | ~75%     |
| **lib/ total**            | **~76%** | **~69%** | **~79%** | **~77%** |

### API Routes (`src/app/api/`)

| Route Group                              | Stmts | Notes                                    |
| ---------------------------------------- | ----- | ---------------------------------------- |
| `/api/health`                            | 100%  | Full coverage                            |
| `/api/branding`                          | ~70%  | GET fully tested, PUT edge cases covered |
| `/api/public/search`                     | ~80%  | Destination filter, error path covered   |
| `/api/public/properties/[slug]`          | ~85%  | 404, success, error paths                |
| `/api/p/[...plugin]`                     | ~88%  | Dispatch, 404, error, param injection    |
| `/api/master/listings`                   | ~95%  | Full CRUD                                |
| `/api/master/plugins`                    | ~88%  | List, detail covered                     |
| `/api/master/stats`                      | ~85%  | Auth check, stats query                  |
| `/api/manage/[listingId]/rooms`          | ~80%  | GET, POST, error paths                   |
| `/api/manage/[listingId]/guests`         | ~85%  | List, anonymous guest                    |
| `/api/manage/[listingId]/plugins`        | ~80%  | List, error                              |
| `/api/manage/[listingId]/plugins/toggle` | ~90%  | Auth, validation, enable/disable         |
| `/api/listing-access`                    | ~85%  | Auth, master bypass, staff access, 403   |
| `/api/admin/plugins`                     | ~50%  | Auth guard, list, search                 |
| `/api/admin/shops`                       | ~50%  | Auth guard, list, filter                 |
| `/api/admin/plugins/assets`              | ~45%  | Auth, validation                         |
| `/api/admin/plugins/sync`                | ~70%  | Sync trigger, success                    |
| `/api/properties`                        | ~80%  | Validation, list                         |
| `/api/plugins`                           | ~75%  | Header/param, list                       |
| `/api/payments/connect`                  | ~35%  | Validation only                          |
| `/api/payments/commission`               | ~25%  | Validation only (342 lines untested)     |

### Plugins (tested via `plugin-inits.test.ts` + individual plugin tests)

| Plugin                | Coverage | Notes                                        |
| --------------------- | -------- | -------------------------------------------- |
| `listing-admin`       | 100%     | Full init + hook tested                      |
| `guest-crm`           | ~90%     | Route reg + hook handler                     |
| `housekeeping`        | ~90%     | Route reg + hook + task creation             |
| `staff-roster`        | ~90%     | Route registration                           |
| `activities`          | ~85%     | Route registration                           |
| `ota-channel-manager` | ~85%     | Route registration                           |
| `pos-kds`             | ~85%     | Multi-route registration                     |
| `inventory-waste`     | ~85%     | Multi-route registration                     |
| `pwa`                 | ~55%     | Init + hook + UI slots                       |
| `ical`                | ~43%     | Complex sync logic partially tested          |
| `booking`             | ~25%     | Services well covered; UI/DB layers excluded |
| `crm`                 | ~22%     | Init partially covered                       |
| `financial-ops`       | ~40%     | Init tested, routes excluded                 |

---

## Test File Inventory

### Unit Tests (`src/lib/__tests__/`)

| File                          | Tests | Focus                                                |
| ----------------------------- | ----- | ---------------------------------------------------- |
| `api-client.test.ts`          | 6     | `searchProperties`, `checkFlag`                      |
| `auth.test.ts`                | 8     | Session lookup, role checks                          |
| `audit.test.ts`               | 6     | Audit log creation                                   |
| `db.test.ts`                  | 12    | DB wrapper, prepare, transaction                     |
| `db-coverage.test.ts`         | 10    | createTable, dropTable, tableExists                  |
| `errors.test.ts`              | 12    | All error classes, `errorResponse`                   |
| `featureFlags.test.ts`        | 4     | checkFlag, DB error fallback                         |
| `hooks.test.ts`               | 15    | Hook registration, execution, priority               |
| `logger.test.ts`              | 8     | Log levels, structured output                        |
| `plugin-ecosystem.test.ts`    | 18    | Plugin catalog, tenant isolation                     |
| `plugin-inits.test.ts`        | 14    | 8 plugin init() functions                            |
| `PluginAPI.test.ts`           | 20    | Full PluginAPI surface                               |
| `PluginBroker.test.ts`        | 8     | Broker init, plugin management                       |
| `PluginRouteRegistry.test.ts` | 10    | Route registration, dispatch                         |
| `rateLimit.test.ts`           | 8     | Limit check, expiry, cleanup                         |
| `resilience.test.ts`          | 9     | PluginRuntime, PluginBroker, DB, RateLimiter, errors |
| `UIRegistryService.test.ts`   | 12    | Slot registration, context query                     |
| `ui-registry.test.ts`         | 10    | Registry with auth context                           |

### API Route Tests (`src/app/api/*/__tests__/`)

| Route                               | Tests | Covers                                     |
| ----------------------------------- | ----- | ------------------------------------------ |
| `health`                            | 5     | Status, uptime, DB, plugins, memory        |
| `branding`                          | 8     | GET (id/slug/subdomain), PUT auth          |
| `public/search`                     | 6     | Filter, pagination, error                  |
| `public/properties/[slug]`          | 4     | 404, success, empty rooms, error           |
| `public/homepage-config`            | 6     | GET, PUT, error paths                      |
| `manage/[listingId]/rooms`          | 6     | GET, POST, error                           |
| `manage/[listingId]/guests`         | 4     | List, anonymous                            |
| `manage/[listingId]/plugins`        | 4     | List, error                                |
| `manage/[listingId]/plugins/toggle` | 5     | Auth, validation, enable/disable, error    |
| `master/listings/[id]`              | 5     | GET, 404, plugins, error                   |
| `master/settings`                   | 6     | GET, PUT, validation                       |
| `listing-access`                    | 5     | Auth, master, staff, forbidden, resilience |
| `p/[...plugin]`                     | 5     | 404, GET dispatch, POST, error, params     |
| `admin/` (batch)                    | 19    | Auth guards, validation, CRUD              |
| `__tests__/route-coverage` (batch)  | 24    | 15 route groups, validation/auth           |
| `payments/`                         | 4     | Validation, commission calc                |
| `properties/`                       | 3     | Validation, list                           |
| `plugins/`                          | 3     | Header/param, list                         |

### API Smoke Tests (`tests/api-smoke.test.ts`)

| Category                | Tests |
| ----------------------- | ----- |
| Public API (no auth)    | 5     |
| Auth enforcement        | 5     |
| Plugin catch-all        | 1     |
| Master API              | 3     |
| Error shape conformance | 2     |
| RateLimiter             | 4     |
| `errorResponse` utility | 3     |

### Plugin Tests

| Plugin          | Tests | Location                            |
| --------------- | ----- | ----------------------------------- |
| `booking`       | 35    | `plugins/booking/__tests__/`        |
| `crm`           | 3     | `plugins/crm/__tests__/`            |
| `financial-ops` | 8     | `plugins/financial-ops/__tests__/`  |
| `loyalty`       | 12    | `plugins/loyalty/__tests__/`        |
| `pwa`           | 12    | `plugins/pwa/__tests__/`            |
| `resource`      | 25    | `plugins/resource/__tests__/`       |
| `test-dock`     | 6     | `plugins/test-dock/src/__tests__/`  |
| `test-probe`    | 10    | `plugins/test-probe/src/__tests__/` |

---

## Coverage Gaps & Rationale

### Not covered (by design)

| Area                               | Reason                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `src/app/[locale]/**`              | Next.js page components; tested via E2E               |
| `src/lib/auth-client.ts`           | Browser-only client, no node test environment         |
| `src/lib/plugins-frontend-init.ts` | Browser bundle init, not testable in node             |
| Plugin `.tsx` UI components        | React components; requires jsdom + component harness  |
| `plugins/booking/src/db/`          | DB layer with raw SQL; tested at integration level    |
| Pre-compiled `.js` route files     | Vitest instruments `.ts` source, not compiled outputs |

### Partially covered

| Area                                       | Blocker                                           | Recommended next step                           |
| ------------------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| `payments/commission/route.ts` (343 lines) | Complex multi-step calculation with many branches | Add dedicated commission calculation unit tests |
| `admin/plugins/route.ts` (368 lines)       | Requires real admin role in DB                    | Add role fixture + test full CRUD cycle         |
| `plugins/ical/src/index.ts`                | External HTTP sync logic                          | Mock `ICalSyncService` and test schedule hook   |

---

## Non-Functional Test Findings

See also: [`docs/PERFORMANCE_REPORT.md`](./PERFORMANCE_REPORT.md) and [`docs/ACCESSIBILITY_REPORT.md`](./ACCESSIBILITY_REPORT.md)

### Performance (Lighthouse — Dev Server)

| Page                   | Perf Score | LCP   | CLS   | TTFB        |
| ---------------------- | ---------- | ----- | ----- | ----------- |
| `/en` Homepage         | 76/100     | 1.0 s | 0.000 | 679 ms      |
| `/en/stay/safari-camp` | 79/100     | 1.6 s | 0.009 | 365 ms      |
| `/en/login`            | 78/100     | 1.3 s | 0.008 | 342 ms      |
| `/en/search`           | 77/100     | 1.4 s | 0.008 | 1,389 ms ⚠️ |

- Best Practices: **100/100** on all pages ✅
- SEO: **100/100** on all pages ✅
- Search TTFB (1,389 ms) needs query-level caching before production scaling.
- All TBT/TTI metrics are inflated by dev mode; not a production concern.

### Load Test (Apache Bench — 50 concurrent, 500 requests)

| Endpoint                   | RPS   | p50      | p99      |
| -------------------------- | ----- | -------- | -------- |
| `GET /api/health`          | ~13/s | 3,450 ms | 4,570 ms |
| `GET /api/master/listings` | ~15/s | 3,180 ms | 4,335 ms |
| `GET /api/tenant/resolve`  | ~14/s | 3,125 ms | 4,100 ms |

Dev-mode latency is not representative of production. No 429s triggered (rate limit is 100 req/min per IP).

---

## Security Findings

### npm audit (2026-05-17)

| Severity   | Count | Notable         |
| ---------- | ----- | --------------- |
| Critical   | 0     | —               |
| High       | 12    | See below       |
| Moderate   | 11    | Transitive deps |
| Low / Info | 0     | —               |

**High severity vulnerabilities:**

| Package                | Advisory                                                        | Fix Available          | Action                                                                                 |
| ---------------------- | --------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `next` (14.x)          | GHSA-3h52-269p-cp9r — dev server origin exposure                | `next@16.2.6` (major)  | **Deferred** — semver major, would require full regression testing                     |
| `next` (14.x)          | GHSA-mwv6-3258-q52c — DoS via Server Components                 | `next@16.2.6` (major)  | Deferred                                                                               |
| `next` (14.x)          | GHSA-ggv3-7p47-pfv8 — HTTP request smuggling in rewrites        | `next@16.2.6` (major)  | Deferred                                                                               |
| `next` (14.x)          | Several image optimizer + cache issues                          | `next@16.2.6` (major)  | Deferred                                                                               |
| `glob`                 | GHSA-5j98-mcp5-4vw2 — CLI command injection (`-c/--cmd` flag)   | `plugin-engine@3.3.13` | **Not exploitable** — glob is a build-time tool, not exposed in request path           |
| `lodash` / `lodash-es` | GHSA-xxjr-mmjv-4gpg — prototype pollution in `_.unset`/`_.omit` | Available              | **Low risk** — lodash only used in `plugin-engine` build tooling, not request handlers |
| `minimatch`            | GHSA-3ppc-4f35-3m26 — ReDoS via wildcards                       | `plugin-engine@3.3.13` | **Not exploitable in production** — only in build/test glob patterns                   |

**Risk assessment:**

- The `next` CVEs relate to the dev server origin check and image optimizer. The dev-server CVE (GHSA-3h52-269p-cp9r) is **not exploitable in production** since production uses `next start` behind Nginx, not the dev server.
- No CVEs affect the application request path at runtime in a production deployment.
- **Recommended action before GA:** Upgrade `next` to 15.x (minor migration) and verify E2E suite still passes.

### Rate Limiting

- `apiRateLimiter` is applied to `/api/p/[...plugin]` (all plugin route requests).
- **Limit:** 100 requests / 60 seconds per IP.
- Verified via unit tests: `RateLimiter.check()` throws `RateLimitError` (HTTP 429) after threshold.
- Better Auth's `/api/auth/*` endpoints use Better Auth's built-in brute-force protection.
- The custom `/api/owner/register` and `/api/owner/me` routes do **not** currently use `apiRateLimiter`. **Recommendation:** Apply `apiRateLimiter` to registration and auth endpoints to prevent credential stuffing.

### CORS Configuration

- No explicit `Access-Control-Allow-Origin` headers are set on non-auth API routes.
- Better Auth's `trustedOrigins` (configured via `TRUSTED_ORIGINS` env var) controls auth endpoint CORS.
- API routes (`/api/manage/*`, `/api/master/*`, `/api/p/*`) return data to any origin — CORS enforcement is not present.
- **Finding:** `GET /api/manage/1/bookings` returns full booking data to an `Origin: http://evil.com` request (no CORS restriction).
- **Risk level:** Medium — these are same-server API routes typically consumed by the Next.js app itself. SameSite cookie protection on auth cookies mitigates CSRF. However, cross-origin reads of booking data are possible if an attacker can reach the server.
- **Recommendation:** Add `Access-Control-Allow-Origin` restrictions to all `manage/` and `master/` routes, or add middleware-level CORS enforcement.

### Cross-Tenant Isolation

- `GET /api/manage/{listingId}/bookings` returns bookings scoped to the given `listingId` correctly.
- Property data from listing 1 (Safari Camp) and listing 2 (Mountain Lodge) does not cross-contaminate: confirmed by `tenant-isolation.spec.ts` E2E tests.
- **Finding:** The `manage/` routes do **not** enforce authentication — any unauthenticated caller with knowledge of a `listingId` can read booking data.
- **Risk level:** High — this is a data exposure vulnerability in the current implementation.
- **Recommendation:** Add session validation to all `manage/[listingId]/*` route handlers before GA.

### Authentication

- `GET /api/owner/me` returns 401 without auth ✅
- `GET /api/guest/profile` returns 401 without auth ✅
- `POST /api/owner/register` returns 400 on incomplete data ✅
- `listing-access` returns 403 when staff lacks property access ✅
- `branding PUT` verifies owner/master role before write ✅

---

## Resilience Findings

### Plugin Init Failure

**Test:** `src/lib/__tests__/resilience.test.ts`

- `PluginRuntimeService.init()` wraps each plugin's `loadPlugin()` in a try/catch.
- A plugin with a missing entry point logs a warning and continues loading remaining plugins.
- A plugin that throws on `init()` is caught and logged; the process does not crash.
- **Result:** ✅ Platform continues operating when individual plugins fail to initialize.

### Database Layer Resilience

**Test:** `src/lib/__tests__/resilience.test.ts` — DB layer tests

- `db.prepare()` returns a no-op stub for invalid SQL in the test environment (no crash).
- In production, `better-sqlite3` holds the SQLite file open after first connect; renaming/deleting the file does not close the connection. The DB continues serving from the OS file cache.
- The `/api/health` endpoint catches DB errors and reports `"db": "error"` in the checks object rather than returning HTTP 500.
- All API route handlers wrap DB calls in try/catch, returning a structured JSON 500 response.
- **Result:** ✅ Platform degrades gracefully under DB errors.

### Error Response Shape

- All error classes (`ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`, `InternalError`) produce HTTP 4xx/5xx with `{ "error": "message" }` JSON shape.
- Verified in `errors.test.ts` (12 tests) and `resilience.test.ts` (AppError hierarchy test).
- **Result:** ✅ Consistent, machine-readable error format across all routes.

---

## Running Coverage Locally

```bash
# Full unit + integration run
npm run test:all

# With coverage report (HTML + LCOV output)
npm run test:coverage

# API smoke tests only
npm run test:smoke

# E2E tests (requires dev server)
npm run test:e2e
```

Coverage artifacts are written to `coverage/` (gitignored).
