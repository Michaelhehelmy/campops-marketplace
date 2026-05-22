# CampOps Marketplace — Agent System Rules

> **This file is the authoritative system prompt for any AI agent working in this repository.**
> Read this completely before writing a single line of code. Do not skip sections.

---

## 1. Project Overview

**CampOps** is a white-label, multi-tenant hospitality marketplace — described as _"WordPress for Rental Marketplaces"_.

One platform powers:

- **sinaicamps.com** — the public listing site (master + marketplace domain)
- **Tenant owner dashboards** — property managers and staff managing their listing
- **Branded tenant shopfronts** — fully branded sub-sites on subdomains or custom domains

The core principle: **Core is a thin framework.** All business logic lives in plugins or themes. Nothing is hardcoded.

### User Roles

| Role      | Domain                  | Access                                                                    |
| --------- | ----------------------- | ------------------------------------------------------------------------- |
| `master`  | sinaicamps.com          | Full platform control, all tenants, billing, master plugins               |
| `admin`   | sinaicamps.com          | Platform management (subset of master)                                    |
| `manager` | sinaicamps.com + tenant | Property owner: full listing control                                      |
| `staff`   | Tenant listing          | Day-to-day ops; blocked from finance/settings/plugins                     |
| `guest`   | **sinaicamps.com only** | Public browse, booking, favourites — always lives on the main marketplace |

> [!IMPORTANT]
> **Guests are a marketplace-level concept.** They register, log in, and manage everything (favourites, booking history, profile, reviews) exclusively on **sinaicamps.com**. Tenant custom-domain shopfronts are **public-facing listing sites** — guests browse and initiate bookings there, but are redirected to sinaicamps.com for authentication and the guest portal. No guest dashboard or auth flows exist on tenant domains.

### Tenant Plans

| Plan       | Features                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| `basic`    | Core listing, limited plugins                                                                                   |
| `premium`  | Subdomain (`slug.sinaicamps.com`), full plugin access                                                           |
| `ultimate` | **Platform-provisioned custom domain** (purchased through the marketplace), PWA, all plugins, branded shopfront |

> [!IMPORTANT]
> **Custom domains are owned and provisioned by the marketplace, not by tenants.** When an `ultimate` tenant requests a custom domain, they purchase it through CampOps (billed via Stripe as part of the Ultimate package). The platform controls DNS, SSL provisioning (Let's Encrypt via Cloudflare/Nginx), and domain renewal. Tenants may not bring external domains — all domains are registered and managed through the CampOps domain service. This gives the platform full control, ensures uptime guarantees, and enables the marketplace to charge for this as a recurring service.

---

## 2. Tech Stack

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Framework      | Next.js 14 (App Router)                               |
| Auth           | `better-auth` v1.6+                                   |
| Database       | SQLite (dev) via `better-sqlite3`                     |
| ORM            | Drizzle ORM                                           |
| API routing    | Hono within Next.js API routes                        |
| Plugin system  | `plugin-engine` (Tapable wrapper)                     |
| i18n           | `next-intl` (5 locales: `en`, `ar`, `fr`, `de`, `ru`) |
| Styling        | Tailwind CSS v3                                       |
| Testing (unit) | Vitest                                                |
| Testing (e2e)  | Playwright                                            |
| Email          | Mailgun (`mailgun.js`)                                |
| Payments       | Stripe                                                |
| PWA            | Dual service workers (marketplace + tenant)           |

---

## 3. Architecture Rules (Non-Negotiable)

1. **Nothing hardcoded** — no field named `price`, `amenities`, `capacity` in core or themes. All business fields are plugin-registered or declared in `theme.json`.
2. **Hooks everywhere** — use `doAction` / `applyFilters` from `@/lib/hooks` for all lifecycle events. Core never calls plugin code directly.
3. **Multi-tenant isolation** — every DB query for tenant data must be scoped by `site_id` or `property_id`. Cross-tenant data leaks are unacceptable.
4. **Preserve tests** — all 1,055+ unit/integration tests and E2E tests must pass after every change. Run `npm run test:all` before finishing any task.
5. **No schema changes without migration** — every DB change requires a `.sql` file in `src/db/migrations/`.

---

## 4. PWA Architecture

### Two Service Workers

#### `sw-marketplace.js` (main platform)

- **Scope**: `sinaicamps.com` and all `*.sinaicamps.com` subdomains
- **Users**: Master, admin, manager, guest
- **Manifest**: `src/app/manifest.ts` (static, platform-branded)
- **Offline**: Cache-first for shell, network-first for API
- **Push**: Booking confirmation, admin alerts
- **Background sync**: `sync-bookings` tag

#### `sw-tenant.js` (platform-provisioned custom domain tenants — Ultimate plan)

- **Scope**: Custom domains provisioned by the marketplace (e.g. `acaciacamp.com` — registered and DNS-managed by CampOps)
- **Users**: Managers and staff managing their property; **public visitors browsing listings**
- **NOT for guests** — no guest portal, no auth, no account management on tenant domains. Guests who click "Book Now" are redirected to sinaicamps.com to complete authentication and checkout.
- **Manifest**: Dynamic from `GET /api/manifest.webmanifest?siteId=` — branded per tenant (tenant name, colors, logo)
- **Cache namespace**: Keyed by hostname so each tenant is isolated
- **Background sync**: `sync-availability` (listing availability pre-fetch for fast load)

#### Registration Logic (`src/components/PWAServiceWorker.tsx`)

```
if (hostname === sinaicamps.com or *.sinaicamps.com) → register sw-marketplace.js
else (platform-provisioned custom domain)            → register sw-tenant.js
```

> **Rule**: Custom domains only reach `sw-tenant.js` if they are provisioned through the CampOps domain service. The middleware validates this via `GET /api/tenant/resolve?host=`. If a host is not in the platform database, it is treated as unknown and not granted tenant access.

#### Offline Fallback

`/public/offline.html` — branded fallback page for both SWs.

### Dynamic Manifest API

`GET /api/manifest.webmanifest?siteId=<id>` returns a per-tenant JSON manifest built from the tenant's branding options stored in the `properties.settings` JSON column. This manifest is served on the tenant's custom domain at `/manifest.webmanifest`.

### Domain Provisioning Flow (Ultimate Plan)

```
1. Tenant selects a domain name in the Owner portal
2. Platform checks availability via domain registrar API
3. Domain is purchased on behalf of the tenant (billed via Stripe)
4. Platform creates DNS A/CNAME records pointing to its servers
5. Let's Encrypt SSL certificate provisioned automatically
6. Nginx config updated — custom domain now resolves to the tenant shopfront
7. Tenant domain added to `properties.custom_domain` in DB
8. `domain_verified = true` set after DNS propagation check
```

The marketplace charges for this as a **recurring annual fee** included in the Ultimate plan or as an add-on.

---

## 5. Plugin System

### Plugin Contract (`plugin.json`)

Every plugin in `plugins/` has a `plugin.json` with:

- `id`, `name`, `version`, `description`, `author`
- `entry` — main TypeScript file
- `hooks` — array of hook names it listens to
- `post_types` — custom post types it registers
- `ui_slots` — dashboard/frontend injection points
- `plan_requirement` — `basic` | `premium` | `ultimate`

### Core Hooks

| Hook                     | Type   | When                        |
| ------------------------ | ------ | --------------------------- |
| `core:request:bootstrap` | action | Every middleware run        |
| `core:site:resolved`     | action | Tenant resolved             |
| `core:post:before_save`  | filter | Before PostRepository write |
| `core:post:after_save`   | action | After post saved            |
| `core:manifest:build`    | filter | Tenant manifest generation  |
| `core:theme:loaded`      | action | After theme manifest parsed |

### Plugin API (from `src/lib/PluginAPI.ts`)

Plugins receive an `api` object exposing:

- `api.doAction(name, data)` / `api.applyFilters(name, value, ctx)`
- `api.context.siteId`, `api.context.plan`
- `api.db` — scoped database access
- `api.registerPostType(definition)`
- `api.options.get/set/delete`

---

## 6. Available MCP Tools

The following MCP servers are configured in `opencode.json`. Use them actively.

| MCP                   | Purpose                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| `filesystem`          | Read/write project files directly                                               |
| `github`              | Read issues, PRs, push code, manage branches                                    |
| `playwright`          | Browser automation — run E2E tests, take screenshots, debug UI                  |
| `sqlite`              | Query `sinaicamps.db` directly — inspect live data                              |
| `sequential-thinking` | Break complex tasks into structured reasoning steps                             |
| `tailwindcss`         | TailwindCSS class completion and design tokens                                  |
| `lucide-icons`        | Search and reference Lucide icon names                                          |
| `next-devtools`       | Next.js developer tools — inspect routes, pages, components                     |
| `next-intl`           | i18n management — translation keys, locale handling                             |
| `docker`              | Manage Docker containers — build, run, inspect                                  |
| `lighthouse`          | Run Lighthouse audits on any URL                                                |
| `better-auth`         | Query/manage auth state via Better Auth                                         |
| `email`               | Send emails via Mailgun (requires `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` env vars) |

---

## 7. Directory Map

```
campops-marketplace/
├── src/
│   ├── app/
│   │   ├── [locale]/        # All pages under locale prefix (en, ar, fr, de, ru)
│   │   │   ├── admin/       # Admin panel (premium+ users)
│   │   │   ├── guest/       # Guest dashboard (logged-in guests)
│   │   │   ├── manage/      # Property management (manager/staff)
│   │   │   ├── master/      # Master operator panel
│   │   │   └── owner/       # Owner onboarding, property settings
│   │   └── api/             # All API routes
│   │       ├── auth/        # better-auth routes
│   │       ├── manage/      # Listing management API
│   │       ├── master/      # Platform admin API
│   │       ├── plugins/     # Plugin store API
│   │       ├── manifest.webmanifest/  # Dynamic tenant PWA manifest
│   │       ├── tenant/      # Tenant resolution + serve
│   │       └── public/      # Unauthenticated read APIs
│   ├── components/          # Shared React components
│   ├── lib/                 # Core utilities
│   │   ├── db.ts            # Database connection
│   │   ├── hooks.ts         # doAction / applyFilters engine
│   │   ├── PluginAPI.ts     # Plugin API factory
│   │   └── errors.ts        # Error helpers
│   └── middleware.ts        # Request lifecycle: tenant resolution, auth guard, CSRF
├── plugins/                 # First-party plugins (booking, crm, financial-ops, resource, etc.)
├── packages/                # Internal workspace packages
│   ├── mcp-server-lighthouse/   # Custom Lighthouse MCP
│   ├── better-auth-mcp/         # Custom Better Auth MCP
│   └── mcp-server-mailgun/      # Custom Mailgun MCP
├── themes/                  # Tenant shopfront themes
├── public/
│   ├── sw-marketplace.js    # Main platform service worker
│   ├── sw-tenant.js         # Tenant custom-domain service worker
│   └── offline.html         # PWA offline fallback
├── e2e/                     # Playwright E2E tests
│   ├── pages/               # Page Object Models (POMs)
│   └── tests/               # Test specs
├── tests/                   # Vitest integration tests
├── scripts/                 # Utility scripts
├── BLUEPRINT.md             # Master architecture document — read before making structural decisions
├── PRODUCTION_READINESS_PLAN.md
└── QA-VERIFICATION-REPORT.md
```

---

## 8. Testing Requirements

### Commands

| Command                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `npm run test`            | Run all Vitest unit + integration tests |
| `npm run test:coverage`   | Run tests with coverage report          |
| `npm run test:e2e`        | Run all Playwright E2E tests (headless) |
| `npm run test:e2e:headed` | Run E2E tests with browser visible      |
| `npm run lint`            | ESLint — must pass with 0 errors        |
| `npm run format:check`    | Prettier — must pass                    |
| `npm run check`           | Runs prettier + lint + tests            |

### Standards

- **Unit/integration coverage**: ≥ 80% (target)
- **E2E**: All tests must pass before any PR
- **CSRF**: All mutating API routes (`POST`/`PUT`/`DELETE`) require `x-csrf-token` header
- **Auth guards**: Sensitive routes must return `401` for unauthenticated requests

---

## 9. Database

- **Dev**: `sinaicamps.db` (SQLite) — use the `sqlite` MCP to inspect directly
- **Schema**: See `schema.sql` and `src/db/migrations/`
- **Key tables**: `properties`, `property_plugins`, `available_plugins`, `users`, `site_users`, `bookings`, `rooms`, `options`
- **NEVER** use raw SQL strings in application code. Use Drizzle ORM or the existing repository pattern.

---

## 10. Agent Behaviour Rules

1. **Always read `BLUEPRINT.md`** before making structural architecture decisions.
2. **Check `QA-VERIFICATION-REPORT.md`** for the current list of known bugs and priorities.
3. **Use `sequential-thinking` MCP** for complex multi-step tasks — plan before coding.
4. **Use `playwright` MCP** to verify UI behaviour before marking a task done.
5. **Use `sqlite` MCP** to verify database state during debugging.
6. **Use `lighthouse` MCP** to audit performance of pages after significant UI changes.
7. **Never break passing tests.** If a change causes a test failure, fix it before continuing.
8. **Always scope DB queries by `site_id`.** Cross-tenant data leaks are a critical security failure.
9. **Log clearly.** Use `console.error` for errors (visible in production logs), `console.log` only in development.
10. **Update `TASKS_STATUS.md`** when completing major tasks.

---

## 11. Environment Variables (Key)

| Variable                  | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_DOMAIN` | Base domain (`sinaicamps.com`)                          |
| `NEXT_PUBLIC_API_URL`     | Internal API base URL                                   |
| `DATABASE_URL`            | SQLite path or PostgreSQL connection string             |
| `BETTER_AUTH_SECRET`      | Auth session signing secret                             |
| `STRIPE_SECRET_KEY`       | Stripe API key                                          |
| `MAILGUN_API_KEY`         | Mailgun API key (for `email` MCP + transactional email) |
| `MAILGUN_DOMAIN`          | Mailgun sending domain                                  |

See `.env.example` for the complete list.

---

## 12. Critical Known Issues (Phase 12 Complete)

| Issue                                                                     | Severity    | Status                                                      |
| ------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| Guest booking blocked — CSRF fails for unauthenticated users              | 🔴 Critical | ✅ Fixed — middleware only validates when cookie exists     |
| No "Book Now" button for guests (unauthenticated)                         | 🔴 Critical | ✅ Fixed — redirects to login then back to checkout         |
| PWA manifest 404 (no `manifest.webmanifest` served on main domain)        | 🟠 High     | ✅ Fixed — rewrite rule in next.config.mjs                  |
| 4 of 5 locales crash — missing translation files (`ar`, `fr`, `de`, `es`) | 🟠 High     | ✅ Fixed — translation files created with English fallback  |
| Homepage missing featured listings and categories                         | 🟠 High     | ✅ Fixed — 3 featured properties + categories seeded        |
| Audit logging not recording (0 records)                                   | 🟠 High     | ✅ Fixed — all mutation routes instrumented                 |
| Metrics endpoint returns empty                                            | 🟡 Medium   | ✅ Fixed — counters added to Node.js-side route handlers    |
| Rate limiter returns 503, should return 429                               | 🟡 Medium   | ✅ Fixed — status code corrected, X-RateLimit headers added |
| Staff session staleness on maintenance pages                              | 🟡 Medium   | ✅ Fixed — updateAge added to better-auth config            |
| React hydration warning in BookingFallback                                | 🟢 Low      | ✅ Fixed — clientDefaults pattern for SSR-safe defaultValue |
| Cross-system E2E failure — dbSlots from disabled plugins                  | 🔴 Critical | ✅ Fixed — filter by enabledPluginSet                       |
| ultimate-redirect E2E excluded — no dev redirect                          | 🟠 High     | ✅ Fixed — `FORCE_LOCAL_REDIRECT=true` env var              |
| Production build fails — missing exports, deps, dynamic flags             | 🔴 Critical | ✅ Fixed — all build errors resolved                        |
 | Lighthouse a11y failures — color contrast, form labels, lang              | 🟡 Medium   | ✅ Fixed — all three pages at 100 a11y score                |
| Homepage showed no featured listings — `is_featured` NULL on all properties | 🟠 High     | ✅ Fixed — seeded via SQL, now controlled via master dashboard |
| Categories API crashed — `no such column: p.category_id`                    | 🟠 High     | ✅ Fixed — migration 009 adds `property_categories` junction table |
| `posts`/`postmeta` tables empty — SSR pre-fetch returned nothing            | 🟠 High     | ✅ Fixed — `scripts/seed-posts-from-properties.ts` seeds data |
| `is_featured` set by SQL with no UI control                                  | 🟠 High     | ✅ Fixed — master dashboard now has "Homepage Feature" toggle with display-order control |
| `--listing-*` CSS vars duplicated `--tenant-*` system                        | 🟡 Medium   | ✅ Fixed — unified to `--tenant-*`; `single-listing.tsx` is the sole template |
| `ThemeLoader` existed but was never called by any page                       | 🟡 Medium   | ✅ Fixed — `stay/[slug]/page.tsx` now resolves template via `ThemeLoader` |
 
**All known issues resolved as of Phase 13 (2026-05-22). Platform is production-ready with 187/187 E2E tests passing, clean production build, 100/100 Lighthouse a11y/BP/SEO scores, homepage showing live featured listings and categories, unified theme rendering via ThemeLoader, and master dashboard controlling featured listing placement.**
