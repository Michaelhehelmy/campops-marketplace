Continuing the exploration. Let me read core framework files, configuration, and key plugin files in parallel.

Now let me read the core source files in

Now let me explore the plugins, app routes, and testing infrastructure.

Now let me explore the API routes and key plugins.

Let me explore the API routes, frontend pages, and testing

Now let me explore the frontend pages and testing infrastructure.

Let me explore the frontend pages, SDK, docs, and remaining key

Let me explore the E2E tests, remaining plugins, and key infrastructure files

Let me explore the remaining plugins and key infrastructure

Let me check the remaining key files

I've gathered extensive context across the entire codebase. Let me now compile the comprehensive enhancement plan.

<｜DSML｜tool_calls>
<｜DSML｜invoke name="write_to_file">
<｜DSML｜parameter name="TargetFile" string="true">/home/michael/Proj/sinaicamps-marketplace/docs/ENHANCEMENT_PLAN.md</｜DSML｜parameter>
<｜DSML｜parameter name="CodeContent" string="true"># SinaiCamps Marketplace — Enhancement Plan

> **Date**: 2026-05-15
> **Scope**: Full-platform architecture review, gap analysis, and phased roadmap
> **Method**: Deep codebase exploration of core framework, 24 plugins, frontend, testing, and deployment infrastructure

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Assessment](#2-architecture-assessment)
3. [Feature Completeness](#3-feature-completeness)
4. [Code Quality](#4-code-quality)
5. [Testing Assessment](#5-testing-assessment)
6. [Performance Analysis](#6-performance-analysis)
7. [Security Review](#7-security-review)
8. [DevOps & Deployment](#8-devops--deployment)
9. [Immediate Improvements (Quick Wins)](#9-immediate-improvements-quick-wins)
10. [Phased Enhancement Roadmap](#10-phased-enhancement-roadmap)
11. [Phase 1 — Platform Polish: Implementation Plan](#11-phase-1--platform-polish-implementation-plan)

---

## 1. Executive Summary

SinaiCamps Marketplace is a **well-architected, genuinely generic multi-tenant platform** with a clean core/plugin separation. The framework successfully avoids domain coupling — booking, CRM, loyalty, and resource concepts all live in plugins, not in core. The testing infrastructure is robust (337 unit tests passing, 5 core E2E suites, Page Object Model pattern). The deployment story covers Vercel, Docker, and bare-metal with Caddy.

**Critical strengths**: Plugin API contract, hook system, tenant isolation via middleware, test-probe pattern, and the disciplined migration of domain tables out of core schema.

**Key gaps**: Many plugins are stubs or partially implemented. The [PluginAPI](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:197:0-269:1) has several no-op stubs (`ui.*`, `services.*`, [plugins.get](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26), [publish](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:229:2-230:46)/[subscribe](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:231:2-231:69)). Error handling is inconsistent. There is no structured logging, rate limiting, audit trail, or email notification infrastructure. Tier enforcement exists in middleware but is incomplete at the API layer.

**Recommendation**: Start with **Phase 1 — Platform Polish** to harden the core before expanding the plugin ecosystem.

---

## 2. Architecture Assessment

### 2.1 Core/Plugin Separation — **Strong**

The separation is real and enforced:

- **Core schema** (`src/db/schema.ts`) contains only generic tables: `users`, `sessions`, `accounts`, `verifications`, `user_roles`, `available_plugins`, `profiles`, `tenants` (née [properties](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/properties:0:0-0:0)), `tenantStaff`, `tenantPlugins`.
- **Plugin tables** are created at runtime via [api.db.createTable()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:182:2-186:69) with the `plugin_<id>_<name>` prefix convention.
- **Domain routes** removed from core: `/api/public/book`, `/api/manage/[id]/bookings`, `/api/guest/reservations` are deprecated stubs pointing to plugin equivalents.
- **Hook system** uses generic names (`transaction:created`, `entity:departed`, `resource:page_load`) with backward-compat aliases.

**Concern**: The [properties](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/properties:0:0-0:0) table still carries hospitality-leaning columns (`price_per_night`, `amenities`, `rating`, `currency_code`). These should migrate to the `resource` plugin's `listings` table, leaving `tenants` truly generic (name, slug, plan, branding, domain).

### 2.2 Plugin API Contract — **Good foundation, incomplete implementation**

The [PluginAPI](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:197:0-269:1) interface ([packages/plugin-sdk/src/types.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:0:0-0:0)) is well-designed with clear separation: `db`, `hooks`, `services`, `ui`, [auth](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/auth:0:0-0:0), [plugins](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/docs/plugins:0:0-0:0), `events`. However, the implementation in `src/lib/PluginAPI.ts` has critical gaps:

| API Surface                                                                                                                                                                                                                                            | Status       | Issue                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | -------------------------------------------- |
| [ui.registerSlot](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:253:4-254:62) / [addSlotComponent](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:255:4-255:66) | **No-op**    | Does not persist to any registry             |
| [ui.registerMenuItem](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:257:4-258:47) / [addMenuItem](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:259:4-259:42)  | **No-op**    | Same                                         |
| [ui.registerDashboardWidget](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:261:4-262:58)                                                                                                                   | **No-op**    | Same                                         |
| [ui.registerSettingsPage](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:265:4-266:60)                                                                                                                      | **No-op**    | Same                                         |
| [services.payment.initiatePayment](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:36:2-41:61)                                                                                                               | **Mock**     | Returns hardcoded URL                        |
| [services.tax.calculateTaxes](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:45:2-51:4)                                                                                                                     | **Mock**     | Returns empty taxes                          |
| [services.notification.send](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:55:2-61:19)                                                                                                                     | **No-op**    | Does nothing                                 |
| [services.i18n.t](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:65:2-65:72)                                                                                                                                | **Identity** | Returns key as-is                            |
| [plugins.get(name)](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26)                                                                                                                            | **No-op**    | Always returns `null`                        |
| [publish](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:229:2-230:46) / [subscribe](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:231:2-231:69)                | **No-op**    | Console.log only                             |
| `config`                                                                                                                                                                                                                                               | **Empty**    | Not populated from `property_plugins.config` |

These stubs mean that plugin [init()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/pwa/src/index.ts:10:0-63:1) functions that call [api.ui.addSlotComponent(...)](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:255:4-255:66) appear to work but have no runtime effect. The UI registry (`/api/plugins/ui-registry`) reads slots from the `available_plugins.manifest` JSON column instead — creating a **dual-source-of-truth problem**.

### 2.3 Middleware — **Solid but has sharp edges**

`src/middleware.ts` handles locale routing, tenant resolution, auth guards, role-based access, and slug rewriting. Key observations:

- **Tenant resolution** makes an HTTP fetch to `/api/tenant/resolve` on every request. This is cached with `revalidate: 60` but still adds latency on cache misses.
- **Auth token detection** checks three cookie names (`sinaicamps_token`, `better-auth.session_token`, `better-auth.session-token`) — fragile and should be consolidated.
- **Staff restriction logic** is duplicated (lines 86-92 and 108-114).
- **Error swallowing**: `catch {}` on line 54 silently ignores tenant resolution failures.
- **`PREMIUM_ONLY` routes** redirect basic-plan tenants but the check only works when `tenantPlan` is resolved (i.e., on subdomain/custom-domain requests, not on the main domain).

### 2.4 Plugin Runtime — **Functional but fragile**

`PluginRuntimeService.ts` uses `jiti` for runtime TypeScript compilation of plugin entry points. This works for development but:

- **No production optimization**: Plugins are re-compiled on every cold start.
- **No versioning or dependency resolution**: If plugin A depends on plugin B, there's no load-order guarantee.
- **`PluginDiscoveryService`** syncs filesystem → database but uses `$1` PostgreSQL-style placeholders in SQL that runs against SQLite — this will fail outside the test environment.

### 2.5 Frontend Plugin System — **Dual approach, neither complete**

There are **two parallel frontend plugin systems**:

1. **`plugins-init.ts`** — Uses `componentRegistry` (a simple `Map<string, ComponentType>`) with hardcoded imports from `plugins/booking/src/ui`, `plugins/crm/src/ui`.
2. **`plugins-frontend-init.ts`** — Uses `slotManager` (Single-SPA parcels) with dynamic `import()` and `singleSpaReact()` wrapping.

[PluginShell.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/PluginShell.tsx:0:0-0:0) tries both: it checks `slotManager.getComponent()` first, then falls back to [componentRegistry.get()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26). This dual approach creates confusion and maintenance burden. The Single-SPA integration adds complexity (parcel mounting, lifecycle management) without clear benefit since all plugins are React components in the same app.

---

## 3. Feature Completeness

### 3.1 Fully Implemented

| Feature                                                 | Location                                                                                                                                   | Notes                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Multi-tenant routing (subdomain/custom domain)          | `middleware.ts`, `/api/tenant/resolve`                                                                                                     | Working, with domain verification       |
| Authentication (email/password)                         | `auth.ts`, Better Auth                                                                                                                     | Sessions, roles, RBAC                   |
| Plugin lifecycle (init, route registration)             | `PluginRuntimeService`, [PluginAPI](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:197:0-269:1) | Working for server-side                 |
| Plugin HTTP route dispatch                              | `PluginRouteRegistry`, catch-all routes                                                                                                    | Regex-based, supports `:param`          |
| Master admin APIs (listings, plugins, stats)            | `/api/master/*`                                                                                                                            | CRUD for listings, plugin management    |
| Tenant plugin enable/disable                            | `/api/manage/[id]/plugins`                                                                                                                 | Working                                 |
| UI registry API                                         | `/api/plugins/ui-registry`                                                                                                                 | Reads from `available_plugins.manifest` |
| Public search & listing detail                          | Resource plugin routes                                                                                                                     | Working                                 |
| Booking engine (check availability, book, check-in/out) | Booking plugin                                                                                                                             | Core flow works                         |
| i18n (5 locales)                                        | `next-intl`, `src/i18n/`, `src/messages/`                                                                                                  | en, ar, fr, de, es                      |
| PWA manifest & service worker                           | `manifest.ts`, `PWAServiceWorker.tsx`                                                                                                      | Basic setup                             |
| Test infrastructure (Vitest + Playwright)               | 337 unit tests, 5 core E2E suites                                                                                                          | Comprehensive                           |

### 3.2 Partially Implemented

| Feature                                   | Status                                                                                                              | Gap                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CRM activity logging                      | Hook listener works                                                                                                 | No UI for viewing activities; [api.db.createTable](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:182:2-186:69) missing `id` column |
| Loyalty points system                     | Hook listeners registered                                                                                           | `LoyaltyService` referenced but not fully verified; `guests` table may not exist                                                                                               |
| PWA push notifications                    | Table created                                                                                                       | No push subscription endpoint, no VAPID key management                                                                                                                         |
| Tier enforcement (Basic/Premium/Ultimate) | Middleware checks exist                                                                                             | No API-level enforcement; `PREMIUM_ONLY` only covers [/admin](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/admin:0:0-0:0)                              |
| Property registration flow                | `POST /api/p/resource/register`                                                                                     | Creates listing as pending; `PROPERTY_REGISTERED` hook handler in resource plugin directly manipulates core tables (bypassing plugin isolation)                                |
| White-label branding                      | [branding](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/branding:0:0-0:0) column on tenants | No UI to configure; [/api/branding](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/branding:0:0-0:0) route exists but untested                           |
| Domain management                         | `/api/domains/check`, `/api/manage/[id]/domain`                                                                     | Basic check endpoint; no DNS/SSL automation                                                                                                                                    |
| Stripe payments                           | `stripe_connect_accounts` table seeded                                                                              | `services.payment` is a mock; no real Stripe integration                                                                                                                       |

### 3.3 Missing / Stub

| Feature                                                         | Evidence                                                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email notifications (booking confirmations, check-in reminders) | [services.notification.send](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:55:2-61:19) is no-op                     |
| Admin audit trail                                               | `audit_logs` table in `schema.sql` but never created or written to                                                                                              |
| Rate limiting                                                   | No implementation anywhere                                                                                                                                      |
| Structured logging / log levels                                 | All logging is `console.*` with ad-hoc prefixes                                                                                                                 |
| Plugin marketplace / third-party plugins                        | `PLUGINS_ECOSYSTEM.md` describes the vision but no infrastructure exists                                                                                        |
| Analytics dashboard                                             | No analytics plugin; `plugin_analytics` table seeded but unused                                                                                                 |
| Housekeeping, Maintenance, Activities plugins                   | Directories exist but contain only [plugin.json](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/routes/index.ts:12:0-18:1) stubs |
| OTA channel manager (SiteMinder, etc.)                          | [OTAAdapter](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:135:0-142:1) types defined in SDK but no implementation  |
| POS/KDS                                                         | Directory exists, stub only                                                                                                                                     |
| Inventory/Waste                                                 | Directory exists, stub only                                                                                                                                     |
| Staff roster                                                    | Directory exists, stub only                                                                                                                                     |
| Accounting, HR, Marketing Automation, Subscriptions             | Directories exist, marked "Planned"                                                                                                                             |

---

## 4. Code Quality

### 4.1 Strengths

- **TypeScript strict mode** enabled ([tsconfig.json](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/tsconfig.json:0:0-0:0)).
- **Consistent plugin [init()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/pwa/src/index.ts:10:0-63:1) signature**: `export default async function init(api: PluginAPI)`.
- **Zod validation** used in booking and resource plugin routes.
- **Clear file organization**: `src/lib/` for framework, [src/app/api/](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api:0:0-0:0) for routes, `plugins/<name>/src/` for plugins.
- **Backward-compatibility aliases** in schema ([properties](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/properties:0:0-0:0) → `tenants`, `propertyStaff` → `tenantStaff`) with clear deprecation comments.
- **`resetMockStore()`** is comprehensive and well-documented.

### 4.2 Issues

#### 4.2.1 Dual Frontend Plugin System (DRY Violation)

`plugins-init.ts` and `plugins-frontend-init.ts` do the same thing differently. The `componentRegistry` and `slotManager` are redundant. Pick one approach and remove the other.

#### 4.2.2 Inconsistent Error Handling

- **`src/lib/db.ts`**: `prepare()` catches errors and returns a no-op stub instead of throwing. This silently swallows real problems.
- **`src/middleware.ts`**: `catch {}` on line 54 ignores tenant resolution failures.
- **Plugin routes**: Some return `{ error: error.message }` with status 500, others return ZodError details with 400. No consistent error envelope format.
- **[src/lib/guest.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/guest.ts:0:0-0:0)**: Uses `$1` PostgreSQL placeholders but the codebase primarily uses SQLite.

#### 4.2.3 SQL Placeholder Inconsistency

The codebase mixes `?` (SQLite) and `$1`, `$2` (PostgreSQL) placeholders:

- `PluginDiscoveryService.ts` line 38: `SET is_active = 0 WHERE name = $1` — **will fail on SQLite**.
- [src/lib/guest.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/guest.ts:0:0-0:0): Uses `$1`, `$2` throughout — **will fail on SQLite**.
- [src/lib/featureFlags.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/featureFlags.ts:0:0-0:0): Uses `$1` — **will fail on SQLite**.
- [plugins/loyalty/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/loyalty/src/index.ts:0:0-0:0): Uses `$1`, `$2` — **will fail on SQLite**.

The `DrizzleDatabaseWrapper._prepareSql()` converts `$1` → `?` but only when called through `db.prepare()`. Direct calls to [db.query()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:175:2-176:52), [db.queryOne()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:177:2-178:53), [db.execute()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:211:4-211:78) also go through `prepare()` so they should work — but the inconsistency is confusing and error-prone.

#### 4.2.4 Hardcoded Values

- `PluginAPI.ts` line 149: `version: '1.0.0'` — should come from [plugin.json](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/routes/index.ts:12:0-18:1) manifest.
- `PluginAPI.ts` line 175: `paymentUrl: 'https://mock-payment.com'` — hardcoded mock.
- [Nav.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/components/Nav.tsx:0:0-0:0) line 31: `SinaiCamps` brand name hardcoded — should use tenant branding config.
- `src/app/[locale]/layout.tsx` line 8: `SinaiCamps Marketplace` title hardcoded.

#### 4.2.5 Type Safety Gaps

- `db.ts` line 11: `export let drizzle: any` — loses all Drizzle type information.
- `PluginRuntimeService.ts` line 27: `rows.map((r: any) => r.plugin_name)` — pervasive `any` usage.
- `auth.ts` line 22: `schema: { ...schema }` — spreads all schema tables, some of which may not exist in PostgreSQL.

#### 4.2.6 Missing Plugin Isolation in Practice

The resource plugin's `PROPERTY_REGISTERED` hook handler ([plugins/resource/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/index.ts:0:0-0:0) lines 79-142) directly inserts into core tables ([properties](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/properties:0:0-0:0), `users`, `user_roles`, `property_staff`, `property_plugins`) using raw SQL. This **bypasses the plugin isolation layer** and creates a tight coupling between the resource plugin and core schema. A proper approach would be for the core to listen to this hook and handle tenant creation itself.

---

## 5. Testing Assessment

### 5.1 Unit Tests (Vitest) — **Strong**

- **337 tests passing, 0 failing, 11 skipped**.
- Core framework tests cover: PluginAPI, hooks, db wrapper, plugin ecosystem, UI registry, master APIs.
- Test setup ([src/test/setup.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/test/setup.ts:0:0-0:0)) resets DB state via `db.resetMockStore()` after each test.
- Mock API builder pattern documented in [TESTING.md](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/TESTING.md:0:0-0:0).

**Gaps**:

- No tests for `PluginDiscoveryService` or `PluginRuntimeService`.
- No tests for `middleware.ts` (the `middleware.test.ts` file exists but is minimal).
- No tests for `SlotManager` or frontend plugin initialization.
- Plugin-level tests are excluded from root Vitest run — they should be integrated.

### 5.2 E2E Tests (Playwright) — **Good foundation**

- **5 core E2E suites**: plugin-lifecycle, multi-tenant-isolation, core-apis, auth, ui-shell.
- **Page Object Model** pattern used ([CoreProbeApiPage](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/e2e/pages/CoreProbeApiPage.ts:7:0-40:1)).
- **Global setup** resets DB before suite.
- **Domain E2E tests** exist for booking, CRM, guest, manager, master, public flows.

**Gaps**:

- No visual regression testing.
- No mobile viewport testing.
- No performance/lighthouse testing in CI.
- E2E tests require a running dev server — no CI-friendly headless mode documented.
- `fullyParallel: false` in Playwright config — tests run serially, slowing CI.

### 5.3 Coverage — **Unknown**

The `coverage/` directory exists but the last run results are not current. A fresh coverage report is needed to identify untested code paths.

---

## 6. Performance Analysis

### 6.1 Identified Bottlenecks

| Issue                                        | Location                                                                                                                            | Severity | Fix                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| **Tenant resolution fetch on every request** | `middleware.ts:44`                                                                                                                  | Medium   | Use in-memory cache with DB fallback; avoid HTTP fetch to self   |
| **Plugin re-compilation on cold start**      | `PluginRuntimeService.ts:87-93`                                                                                                     | Medium   | Pre-compile plugins during build; use `next build` plugin        |
| **No static generation for public pages**    | [page.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/%5Blocale%5D/page.tsx:0:0-0:0) uses `cache: 'no-store'` | Medium   | Use ISR with tenant-aware revalidation                           |
| **Sequential plugin loading**                | `PluginRuntimeService.ts:39-42`                                                                                                     | Low      | Load plugins in parallel with `Promise.all`                      |
| **No database query caching**                | `db.ts`                                                                                                                             | Medium   | Add LRU cache for frequent queries (tenant resolve, plugin list) |
| **No CDN configuration for static assets**   | `next.config.mjs`                                                                                                                   | Low      | Add `Cache-Control` headers for `/_next/static/*`                |
| **Large `resetMockStore()`**                 | `db.ts:267-710`                                                                                                                     | Low      | Runs on every test; 100+ SQL statements executed sequentially    |

### 6.2 Database

- **SQLite** is used for development/testing. It's appropriate for single-server deployments but will become a bottleneck under concurrent write loads.
- **PostgreSQL** support exists (`DATABASE_URL` check in `db.ts`) but is untested in the current codebase.
- **No connection pooling** for PostgreSQL — the `Pool` is created but not configured with pool size limits.
- **No read replicas** or read/write split.

---

## 7. Security Review

### 7.1 Strengths

- **Better Auth** integration with session management.
- **RBAC** via `user_roles` table with [master](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/master:0:0-0:0), `manager`, `staff`, [guest](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/guest:0:0-0:0) roles.
- **Tenant isolation** in [ScopedRepository](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:25:0-31:1) — all queries are filtered by `property_id`.
- **Middleware auth guards** for [/manage](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/manage:0:0-0:0), [/owner](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/owner:0:0-0:0), [/admin](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/admin:0:0-0:0), [/guest](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/guest:0:0-0:0) routes.
- **Staff restrictions** on `/finance`, `/settings`, [/plugins](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/docs/plugins:0:0-0:0).
- **Domain verification** before serving custom domain tenants.

### 7.2 Vulnerabilities & Concerns

| Issue                                  | Severity | Details                                                                                                         |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| **No CSRF protection**                 | High     | API routes accept requests without CSRF tokens                                                                  |
| **No rate limiting**                   | High     | Brute-force on login, API abuse possible                                                                        |
| **Error messages leak internals**      | Medium   | `error.message` returned to client in non-production; stack traces in `master/stats`                            |
| **No input sanitization**              | Medium   | SQL parameters use placeholders (safe) but no XSS prevention on user-generated content                          |
| **`adminId` check in master/stats**    | Low      | `adminId !== 'master-admin'` is a trivial string comparison, not session-based                                  |
| **Cookie-based auth without HttpOnly** | Medium   | `sinaicamps_role` cookie is set but may not be HttpOnly                                                         |
| **No CORS configuration**              | Medium   | No explicit CORS headers; relies on Next.js defaults                                                            |
| **Hardcoded password hash in seed**    | Low      | `hashedPassword` in `db.ts:345` is a known test password — acceptable for tests but should not reach production |

---

## 8. DevOps & Deployment

### 8.1 Strengths

- **Dockerfile** is well-structured with multi-stage builds and standalone output.
- **docker-compose.yml** provides a full local stack (PostgreSQL + backend + Nginx frontend).
- **Deployment docs** cover Vercel, Docker, and VPS/Caddy.
- **Cloudflare config** documented with cache rules and SSL for SaaS.
- **Nginx configs** (`nginx-frontend.conf`, `nginx-multi-tenant.conf`) included.

### 8.2 Gaps

- **No CI/CD pipeline** defined (no `.github/workflows/` or equivalent).
- **No health check endpoint** for orchestration (the `/api/test-probe/ping` could serve this role but isn't documented as such).
- **No database migration strategy** — `schema.sql` is a full dump, not incremental migrations.
- **No secrets management** — `.env.example` is minimal; no mention of Vault, Doppler, or similar.
- **No monitoring/observability** — no OpenTelemetry, Sentry, or log aggregation.
- **[docker-compose.yml](cci:7://file:///home/michael/Proj/docker-compose.yml:0:0-0:0)** uses `npm run dev` in the backend container — not production-ready.
- **No backup strategy** documented for the SQLite database.

---

## 9. Immediate Improvements (Quick Wins)

These can be done in a single sprint (1-2 weeks) with high impact:

### 9.1 Bug Fixes

1. **Fix `$1` placeholder in `PluginDiscoveryService.ts:38`** — change to `?` for SQLite compatibility.
2. **Fix `$1`/`$2` in [src/lib/guest.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/guest.ts:0:0-0:0)** — ensure compatibility or mark as PostgreSQL-only.
3. **Fix `$1`/`$2` in [src/lib/featureFlags.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/featureFlags.ts:0:0-0:0)** — same.
4. **Fix `$1`/`$2` in [plugins/loyalty/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/loyalty/src/index.ts:0:0-0:0)** — same.
5. **Add missing `id` column to CRM `activities` table** — [createTable](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:182:2-186:69) call has no primary key.
6. **Remove duplicate staff restriction logic in middleware** — extract to a helper function.

### 9.2 Code Cleanup

7. **Remove `plugins-init.ts`** — consolidate into `plugins-frontend-init.ts` as the single frontend plugin system.
8. **Remove `componentRegistry`** — use `slotManager` exclusively.
9. **Add [PluginAPI](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:197:0-269:1) version from manifest** — read [plugin.json](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/routes/index.ts:12:0-18:1) instead of hardcoding `'1.0.0'`.
10. **Standardize error response format** — create a shared `errorResponse(status, message, details?)` helper.

### 9.3 Testing

11. **Add unit tests for `PluginDiscoveryService`** — mock `fs` and `db`, verify sync logic.
12. **Add unit tests for `PluginRuntimeService`** — mock `jiti`, verify plugin loading.
13. **Add middleware tests** — test auth redirects, tier enforcement, tenant resolution.
14. **Run fresh coverage report** — identify untested code paths.

### 9.4 Security

15. **Add rate limiting** — use `next-rate-limit` or similar for auth endpoints.
16. **Add `HttpOnly` flag to auth cookies** — verify Better Auth configuration.
17. **Replace `adminId` string check in master/stats** — use session-based auth.

---

## 10. Phased Enhancement Roadmap

### Phase 1 — Platform Polish (4-6 weeks) ⭐ **START HERE**

**Priority**: Critical
**Effort**: Medium

**Goals**:

- Harden the core framework for production use
- Standardize error handling, logging, and API patterns
- Implement missing PluginAPI features (ui slots, inter-plugin communication)
- Add audit trail, rate limiting, and email notifications

**Key Outcomes**:

- Structured logging with log levels and request IDs
- Consistent JSON error envelope across all APIs
- Working `api.ui.*` methods that persist to the UI registry
- Working [api.plugins.get()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26) for inter-plugin communication
- Rate limiting on auth and API endpoints
- Email notifications for booking confirmations and check-in reminders
- Admin audit log for sensitive operations
- Health check endpoint

**Required Changes**:

- **Core**: `PluginAPI.ts` (implement ui stubs, services, plugins.get), new `src/lib/logger.ts`, new `src/lib/errors.ts`, new `src/lib/rate-limit.ts`, new `src/lib/audit.ts`
- **Middleware**: Add request ID header, consolidate staff checks
- **API routes**: Standardize error responses, add rate limit headers
- **Infrastructure**: Email service (Resend/SendGrid), log aggregation config

---

### Phase 2 — Extended Plugin Ecosystem (6-8 weeks)

**Priority**: High
**Effort**: High

**Goals**:

- Flesh out stub plugins into working implementations
- Build plugin marketplace infrastructure for third-party developers
- Create plugin SDK CLI tooling

**Key Outcomes**:

- Working Housekeeping, Maintenance, Activities plugins
- Plugin marketplace: install/update/uninstall from admin UI
- Plugin versioning and dependency resolution
- Plugin SDK CLI (`create-sinaicamps-plugin`)
- Plugin sandboxing (VM2/isolated-vm for untrusted code)

**Required Changes**:

- **Core**: Plugin marketplace APIs, plugin version manager, sandbox runtime
- **New plugins**: housekeeping (full), maintenance (full), activities (full), analytics
- **SDK**: CLI tooling, scaffolding templates, publish workflow
- **Infrastructure**: Plugin registry service, npm-compatible package storage

---

### Phase 3 — Advanced Domain & Hosting Management (4-6 weeks)

**Priority**: High
**Effort**: Medium

**Goals**:

- Automate DNS, SSL, and domain lifecycle
- Integrate with Cloudflare API for real domain registration
- Build domain purchase/transfer flow

**Key Outcomes**:

- Automated SSL provisioning via Cloudflare/Caddy
- Domain purchase flow in admin UI
- DNS record management from dashboard
- Domain invoicing and renewal reminders
- Wildcard SSL for tenant subdomains

**Required Changes**:

- **Core**: Cloudflare API integration, domain service, SSL provisioning service
- **Frontend**: Domain management pages, purchase flow UI
- **Infrastructure**: Cloudflare API tokens, webhook handlers for DNS events

---

### Phase 4 — Multi-Language & Internationalization (3-4 weeks)

**Priority**: Medium
**Effort**: Medium

**Goals**:

- Full i18n for all tenant-facing and admin pages
- Currency and date localization per tenant
- RTL support for Arabic

**Key Outcomes**:

- All UI strings externalized to translation files
- Per-tenant locale defaults
- Currency conversion and display formatting
- Date/time formatting per locale
- RTL layout for Arabic

**Required Changes**:

- **Frontend**: All pages and components, translation keys
- **Core**: `services.i18n` real implementation, currency service
- **Plugins**: All plugin UI components

---

### Phase 5 — Performance & Scale (4-6 weeks)

**Priority**: Medium
**Effort**: High

**Goals**:

- Move to edge-rendering where possible
- Implement caching strategies
- Database optimization for multi-tenant scale

**Key Outcomes**:

- ISR for public pages with tenant-aware revalidation
- Redis cache layer for frequent queries
- Database read replicas for analytics queries
- CDN configuration for static assets
- Image optimization pipeline
- Bundle size optimization

**Required Changes**:

- **Core**: Cache service, ISR configuration, read/write split
- **Infrastructure**: Redis cluster, read replicas, CDN rules
- **Build**: Webpack/Vite optimization, tree-shaking audit

---

### Phase 6 — Mobile & Offline (6-8 weeks)

**Priority**: Low
**Effort**: High

**Goals**:

- Full PWA capabilities
- Native app shells (React Native or Capacitor)
- Offline-first booking flow

**Key Outcomes**:

- Installable PWA with offline support
- Push notifications for booking updates
- Offline booking form with sync on reconnect
- Native iOS/Android app shells
- Biometric authentication

**Required Changes**:

- **PWA plugin**: Service worker strategies, IndexedDB sync, push API
- **New**: React Native or Capacitor project
- **Core**: Offline-aware API client, sync queue

---

### Phase 7 — AI-Powered Features (8-10 weeks)

**Priority**: Low
**Effort**: High

**Goals**:

- Smart recommendations for guests
- Dynamic pricing engine for admins
- Occupancy forecasting

**Key Outcomes**:

- Personalized listing recommendations based on guest history
- ML-driven dynamic pricing with demand forecasting
- Occupancy prediction for inventory management
- Chatbot for guest inquiries
- Sentiment analysis on guest reviews

**Required Changes**:

- **New plugins**: recommendation-engine, dynamic-pricing, forecasting
- **Core**: ML model serving infrastructure, feature store
- **Infrastructure**: GPU instances or cloud AI services (OpenAI, Vertex AI)

---

## 11. Phase 1 — Platform Polish: Implementation Plan

### 11.1 Overview

**Duration**: 4-6 weeks
**Team**: 2-3 developers
**Priority**: Critical — this phase must complete before any new plugin development

### 11.2 Week 1-2: Foundation

#### Task 1.1: Structured Logging (`src/lib/logger.ts`)

- Create a [Logger](cci:2://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:93:0-98:1) class wrapping `pino` or `winston`
- Support log levels: `trace`, [debug](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:97:2-97:42), [info](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:94:2-94:41), [warn](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:95:2-95:41), [error](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:96:2-96:42)
- Include request ID (from `x-request-id` header) in every log line
- JSON output in production, pretty-print in development
- Replace all `console.*` calls in core with logger
- **Files**: New `src/lib/logger.ts`, modify `PluginAPI.ts`, `middleware.ts`, `db.ts`, all route handlers
- **Tests**: Verify log output format, request ID propagation

#### Task 1.2: Standardized Error Handling (`src/lib/errors.ts`)

- Create `AppError` class hierarchy: `ValidationError`, `AuthError`, `NotFoundError`, `RateLimitError`
- Create `errorResponse(error: AppError): Response` helper
- Standard JSON envelope: `{ error: { code, message, details? } }`
- Update catch-all route handler to use standardized errors
- **Files**: New `src/lib/errors.ts`, modify `src/app/api/[...path]/route.ts`, `src/app/api/p/[...plugin]/route.ts`
- **Tests**: Verify error response format for each error type

#### Task 1.3: Fix SQL Placeholder Inconsistency

- Audit all `.ts` files for `$1`, `$2` placeholders
- Convert to `?` for SQLite compatibility or add explicit PostgreSQL-only guards
- **Files**: `PluginDiscoveryService.ts`, [guest.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/guest.ts:0:0-0:0), [featureFlags.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/lib/featureFlags.ts:0:0-0:0), [plugins/loyalty/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/loyalty/src/index.ts:0:0-0:0)
- **Tests**: Verify queries execute correctly against SQLite

### 11.3 Week 3-4: Core API Hardening

#### Task 2.1: Implement `api.ui.*` Methods

- Create `UIRegistryService` that persists slot registrations to `property_plugins.config` or a new `plugin_ui_registry` table
- Wire [api.ui.registerSlot](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:253:4-254:62), [addSlotComponent](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:255:4-255:66), [registerMenuItem](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:257:4-258:47), [registerDashboardWidget](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:261:4-262:58), [registerSettingsPage](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:265:4-266:60) to the service
- Update `/api/plugins/ui-registry` to read from the registry service (not just `available_plugins.manifest`)
- **Files**: New `src/lib/UIRegistryService.ts`, modify `PluginAPI.ts`, [ui-registry/route.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/plugins/ui-registry/route.ts:0:0-0:0)
- **Tests**: Verify slot registration persists and is returned by UI registry API

#### Task 2.2: Implement [api.plugins.get()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26)

- Create `PluginBroker` that tracks loaded plugin instances and their returned APIs
- Wire [api.plugins.get(name)](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26) to return another plugin's public API
- **Files**: New `src/lib/PluginBroker.ts`, modify `PluginAPI.ts`, `PluginRuntimeService.ts`
- **Tests**: Verify cross-plugin API access

#### Task 2.3: Rate Limiting

- Add in-memory rate limiter (or Redis-backed for multi-instance)
- Apply to: `/api/auth/*` (5 req/min), general API (60 req/min), public booking (10 req/min)
- Return `429 Too Many Requests` with `Retry-After` header
- **Files**: New `src/lib/rate-limit.ts`, modify middleware or individual route handlers
- **Tests**: Verify rate limit enforcement and headers

### 11.4 Week 5-6: Operations & Notifications

#### Task 3.1: Email Notifications

- Integrate Resend or SendGrid for transactional email
- Implement [services.notification.send()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:55:2-61:19) in PluginAPI
- Create email templates: booking confirmation, check-in reminder, checkout thank-you, property registration
- Trigger from hook listeners
- **Files**: New `src/lib/email.ts`, modify `PluginAPI.ts`, new email templates
- **Tests**: Verify email sending with mock transport

#### Task 3.2: Admin Audit Trail

- Create `audit_logs` table: `id, actor_id, action, resource_type, resource_id, tenant_id, details, ip_address, created_at`
- Create `AuditService` with `log(action, resource, details)` method
- Log: plugin enable/disable, listing create/update/delete, user role changes, domain changes
- Add audit log viewer to master admin UI
- **Files**: New `src/lib/audit.ts`, new `src/app/api/master/audit/route.ts`, modify admin routes
- **Tests**: Verify audit entries are created for sensitive operations

#### Task 3.3: Health Check Endpoint

- Create `GET /api/health` returning: `{ status: 'ok', uptime, db: 'connected'|'error', plugins: { loaded, total } }`
- Document for orchestration use
- **Files**: New `src/app/api/health/route.ts`
- **Tests**: Verify health check response

#### Task 3.4: Consolidate Frontend Plugin System

- Remove `src/lib/plugins-init.ts` and `src/components/plugins/ComponentRegistry.tsx`
- Keep `src/lib/plugins-frontend-init.ts` and `src/lib/SlotManager.tsx` as the single system
- Update [PluginShell.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/PluginShell.tsx:0:0-0:0) to only use `slotManager`
- **Files**: Remove `plugins-init.ts`, modify [PluginShell.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/PluginShell.tsx:0:0-0:0)
- **Tests**: Update any tests referencing the old system

### 11.5 Test Requirements for Phase 1

Each task must include:

- **Unit tests** for new services (logger, errors, rate limiter, audit, email)
- **Integration tests** for API changes (error format, rate limit headers, UI registry)
- **E2E tests** for critical paths (health check, audit log visibility, notification triggers)
- **Regression**: All 337 existing tests must continue to pass

### 11.6 Definition of Done for Phase 1

- [ ] All `console.*` in core replaced with structured logger
- [ ] All API errors follow standard envelope format
- [ ] `api.ui.*` methods persist and are retrievable
- [ ] [api.plugins.get()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:240:4-240:26) works for inter-plugin calls
- [ ] Rate limiting active on auth and API endpoints
- [ ] Email notifications sent for booking lifecycle events
- [ ] Audit trail records all sensitive admin operations
- [ ] Health check endpoint responds correctly
- [ ] Single frontend plugin system (no dual approach)
- [ ] All SQL placeholders consistent with active database
- [ ] 100% of new code covered by tests
- [ ] All existing tests pass

---

## Appendix A: Plugin Inventory

| Plugin               | Directory                       | Status     | Has [plugin.json](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/routes/index.ts:12:0-18:1) | Has [init()](cci:1://file:///home/michael/Proj/sinaicamps-marketplace/plugins/pwa/src/index.ts:10:0-63:1) | Has Tests |
| -------------------- | ------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- |
| accounting           | `plugins/accounting/`           | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| activities           | `plugins/activities/`           | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| booking              | `plugins/booking/`              | **Active** | Yes                                                                                                                        | Yes                                                                                                       | Yes       |
| crm                  | `plugins/crm/`                  | **Active** | Yes                                                                                                                        | Yes                                                                                                       | No        |
| financial-ops        | `plugins/financial-ops/`        | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| guest-crm            | `plugins/guest-crm/`            | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| housekeeping         | `plugins/housekeeping/`         | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| hr-core              | `plugins/hr-core/`              | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| ical                 | `plugins/ical/`                 | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| ical-import          | `plugins/ical-import/`          | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| inventory-waste      | `plugins/inventory-waste/`      | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| listing-admin        | `plugins/listing-admin/`        | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| loyalty              | `plugins/loyalty/`              | **Active** | Yes                                                                                                                        | Yes                                                                                                       | No        |
| maintenance          | `plugins/maintenance/`          | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| marketing-automation | `plugins/marketing-automation/` | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| ota-channel-manager  | `plugins/ota-channel-manager/`  | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| pos-kds              | `plugins/pos-kds/`              | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| pwa                  | `plugins/pwa/`                  | **Active** | Yes                                                                                                                        | Yes                                                                                                       | No        |
| resource             | `plugins/resource/`             | **Active** | Yes                                                                                                                        | Yes                                                                                                       | No        |
| siteminder           | `plugins/siteminder/`           | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| staff-roster         | `plugins/staff-roster/`         | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| subscriptions        | `plugins/subscriptions/`        | Stub       | Yes                                                                                                                        | No                                                                                                        | No        |
| test-dock            | `plugins/test-dock/`            | **Active** | Yes                                                                                                                        | Yes                                                                                                       | Yes       |
| test-probe           | `plugins/test-probe/`           | **Active** | Yes                                                                                                                        | Yes                                                                                                       | Yes       |

**Summary**: 5 active plugins, 19 stubs. Only 2 plugins have tests.

## Appendix B: Key File Reference

| File                                                                                                                                  | Lines | Purpose                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| `src/middleware.ts`                                                                                                                   | 202   | Locale, tenant, auth, role-based routing                                                                            |
| `src/lib/PluginAPI.ts`                                                                                                                | 246   | Plugin API factory (the plugin contract)                                                                            |
| `src/lib/db.ts`                                                                                                                       | 780   | Database wrapper, seeding, reset                                                                                    |
| `src/lib/hooks.ts`                                                                                                                    | 125   | Hook manager (Tapable-based)                                                                                        |
| `src/lib/auth.ts`                                                                                                                     | 59    | Better Auth configuration                                                                                           |
| `src/lib/PluginRouteRegistry.ts`                                                                                                      | 118   | Plugin HTTP route registry                                                                                          |
| `src/lib/PluginRuntimeService.ts`                                                                                                     | 121   | Plugin loading and initialization                                                                                   |
| `src/lib/PluginDiscoveryService.ts`                                                                                                   | 107   | Filesystem → DB plugin sync                                                                                         |
| `src/lib/SlotManager.tsx`                                                                                                             | 71    | Single-SPA parcel manager                                                                                           |
| `src/db/schema.ts`                                                                                                                    | 180   | Drizzle ORM schema (core tables only)                                                                               |
| [packages/plugin-sdk/src/types.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts:0:0-0:0) | 275   | Plugin SDK type definitions                                                                                         |
| [src/app/PluginShell.tsx](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/src/app/PluginShell.tsx:0:0-0:0)                   | 103   | Frontend plugin slot renderer                                                                                       |
| `src/app/api/[...path]/route.ts`                                                                                                      | 96    | Catch-all API for plugin routes                                                                                     |
| `src/app/api/p/[...plugin]/route.ts`                                                                                                  | 84    | Alternative catch-all for [/api/p/](cci:9://file:///home/michael/Proj/sinaicamps-marketplace/src/app/api/p:0:0-0:0) |
| [plugins/booking/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/booking/src/index.ts:0:0-0:0)         | 138   | Booking plugin entry point                                                                                          |
| [plugins/resource/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/resource/src/index.ts:0:0-0:0)       | 146   | Resource plugin entry point                                                                                         |
| [plugins/crm/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/crm/src/index.ts:0:0-0:0)                 | 101   | CRM plugin entry point                                                                                              |
| [plugins/pwa/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/pwa/src/index.ts:0:0-0:0)                 | 65    | PWA plugin entry point                                                                                              |
| [plugins/loyalty/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/loyalty/src/index.ts:0:0-0:0)         | 256   | Loyalty plugin entry point                                                                                          |
| [plugins/test-probe/src/index.ts](cci:7://file:///home/michael/Proj/sinaicamps-marketplace/plugins/test-probe/src/index.ts:0:0-0:0)   | 106   | Test probe plugin                                                                                                   |

---

> **Next Steps**: Review this plan with stakeholders, prioritize Phase 1 tasks, and begin with Task 1.1 (Structured Logging) as the foundation for all subsequent work.
> </｜DSML｜parameter>
> </｜DSML｜invoke>
> </｜DSML｜tool_calls>
