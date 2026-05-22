# SinaiCamps Marketplace — OpenCode Agent Rules

> **This file is the authoritative system prompt for OpenCode agents working in this repository.**
> Read this completely before writing a single line of code. Do not skip sections.

**Project:** SinaiCamps Marketplace
**Developer:** Michael Helmy ([@Michaelhehelmy](https://github.com/Michaelhehelmy))
**AI Environment:** [OpenCode](https://opencode.ai) — configured via `opencode.json`
**Production:** `sinaicamps.com` on Oracle Cloud (Ubuntu VM, PM2, Nginx, Cloudflare CDN)

---

## 1. Project Overview

**SinaiCamps** is a white-label, multi-tenant hospitality marketplace — _"WordPress for Rental Marketplaces"_.

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
> **Custom domains are owned and provisioned by the marketplace, not by tenants.** When an `ultimate` tenant requests a custom domain, they purchase it through SinaiCamps (billed via Stripe as part of the Ultimate package). The platform controls DNS, SSL provisioning (Let's Encrypt via Cloudflare/Nginx), and domain renewal. Tenants may not bring external domains.

---

## 2. Tech Stack

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Framework      | Next.js 14 (App Router, `output: 'standalone'`)       |
| Auth           | `better-auth` v1.6+                                   |
| Database       | SQLite via `better-sqlite3` (`sinaicamps.db`)         |
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
| Deployment     | Oracle Cloud VM, PM2, Nginx, Cloudflare               |

---

## 3. Architecture Rules (Non-Negotiable)

1. **Nothing hardcoded** — no field named `price`, `amenities`, `capacity` in core or themes. All business fields are plugin-registered or declared in `theme.json`.
2. **Hooks everywhere** — use `doAction` / `applyFilters` from `@/lib/hooks` for all lifecycle events. Core never calls plugin code directly.
3. **Multi-tenant isolation** — every DB query for tenant data must be scoped by `site_id` or `property_id`. Cross-tenant data leaks are unacceptable.
4. **Preserve tests** — all unit/integration tests and E2E tests must pass after every change. Run `npm run test:all` before finishing any task.
5. **No schema changes without migration** — every DB change requires a `.sql` file in `src/db/migrations/`.

---

## 4. OpenCode Configuration

This project uses **OpenCode** as the AI coding environment. Config is in `opencode.json`.

### OpenCode Plugins (active)

| Plugin                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `opencode-agent-memory`      | Persist context across sessions                      |
| `opencode-background-agents` | Run long tasks in background                         |
| `opencode-handoff`           | Hand off tasks between agent sessions                |
| `opencode-skills`            | Load reusable agent skill definitions                |

### Language Servers (LSP)

| Server        | Extensions              |
| ------------- | ----------------------- |
| `typescript`  | `.ts`, `.tsx`, `.js`, `.jsx` |
| `tailwindcss` | `.ts`, `.tsx`, `.css`   |

---

## 5. MCP Tools (from `opencode.json`)

All MCP servers below are configured and active. Use them proactively.

| MCP                   | Package / Command                                | Purpose                                                       |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `filesystem`          | `@modelcontextprotocol/server-filesystem`        | Read/write project files directly                             |
| `github`              | `@modelcontextprotocol/server-github`            | Read issues, PRs, push code, manage branches                  |
| `playwright`          | `@playwright/mcp`                                | Browser automation — run E2E tests, take screenshots, debug UI |
| `sqlite`              | `mcp-server-sqlite --db ./sinaicamps.db`         | Query `sinaicamps.db` directly — inspect live data            |
| `sequential-thinking` | `@modelcontextprotocol/server-sequential-thinking` | Break complex tasks into structured reasoning steps          |
| `tailwindcss`         | `tailwindcss-mcp@latest`                         | TailwindCSS class completion and design tokens                |
| `lucide-icons`        | `lucide-icons-mcp@latest`                        | Search and reference Lucide icon names                        |
| `next-devtools`       | `next-devtools-mcp@latest`                       | Next.js developer tools — inspect routes, pages, components   |
| `next-intl`           | `@i18nexus/mcp@latest`                           | i18n management — translation keys, locale handling          |
| `lighthouse`          | `packages/mcp-server-lighthouse/src/index.ts`    | Run Lighthouse audits on any URL (custom local MCP)           |
| `better-auth`         | `packages/better-auth-mcp/src/index.ts`          | Query/manage auth state via Better Auth (custom local MCP)    |
| `email`               | `packages/mcp-server-mailgun/src/index.ts`       | Send emails via Mailgun (custom local MCP)                    |

> [!TIP]
> Use `sequential-thinking` before starting any task with more than 2 steps. Use `sqlite` to verify database state during debugging. Use `playwright` to confirm UI behaviour before marking tasks done.

---

## 6. PWA Architecture

### Two Service Workers

#### `sw-marketplace.js` (main platform)

- **Scope**: `sinaicamps.com` and all `*.sinaicamps.com` subdomains
- **Cache keys**: `sinaicamps-marketplace-static-*`, `sinaicamps-marketplace-dynamic-*`
- **Users**: Master, admin, manager, guest
- **Manifest**: `src/app/manifest.ts` (static, platform-branded)
- **Offline**: Cache-first for shell, network-first for API
- **Push**: Booking confirmation, admin alerts (`sinaicamps-notification` tag)

#### `sw-tenant.js` (platform-provisioned custom domain tenants — Ultimate plan)

- **Scope**: Custom domains provisioned by the marketplace (e.g. `acaciacamp.com`)
- **Cache keys**: `sinaicamps-tenant-{hostname}-static-*`, etc.
- **Users**: Managers/staff + public visitors
- **NOT for guests** — guests who click "Book Now" are redirected to sinaicamps.com

#### Registration Logic (`src/components/PWAServiceWorker.tsx`)

```
if (hostname === sinaicamps.com or *.sinaicamps.com) → register sw-marketplace.js
else (platform-provisioned custom domain)            → register sw-tenant.js
```

---

## 7. Plugin System

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

## 8. Directory Map

```
sinaicamps-marketplace/
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
├── scripts/
│   ├── deploy-sinaicamps.sh # PRIMARY deploy script (build locally, rsync to Oracle)
│   ├── deploy.sh            # Server-side deploy script (git pull on Oracle)
│   ├── boot.sh              # Oracle VM startup script
│   └── backup-db.sh         # Database backup script
├── opencode.json            # OpenCode MCP + LSP configuration
├── ecosystem.config.js      # PM2 process configuration
├── nginx-unified.conf       # Nginx reverse proxy config
├── BLUEPRINT.md             # Master architecture document
├── AUTHORS.md               # Project authorship
└── QA-VERIFICATION-REPORT.md
```

---

## 9. Deployment

### Primary Workflow (local build → rsync to Oracle)

```bash
# 1. Build locally (fast — uses your machine's full RAM/CPU)
export NODE_OPTIONS=--max-old-space-size=4096
npm run build

# 2. Deploy to Oracle (rsync only changed files)
./scripts/deploy-sinaicamps.sh
```

### Server-Side Workflow (git pull on Oracle)

```bash
# For quick deploys when only config/docs changed
ssh -i ~/Downloads/oracle.key ubuntu@84.235.239.6 \
  "nohup bash -c 'FORCE=1 ~/marketplace/scripts/deploy.sh' > ~/deploy.log 2>&1 &"

# Watch logs
ssh -i ~/Downloads/oracle.key ubuntu@84.235.239.6 "tail -f ~/deploy.log"
```

### Daily Auto-Deploy (cron on Oracle)
Configured via `crontab -l` on the Oracle VM: `0 3 * * *` runs `deploy.sh`.

---

## 10. Testing Requirements

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

## 11. Database

- **File**: `sinaicamps.db` (SQLite)
- **Inspect**: Use the `sqlite` MCP to query directly
- **Schema**: See `schema.sql` and `src/db/migrations/`
- **Key tables**: `properties`, `property_plugins`, `available_plugins`, `users`, `site_users`, `bookings`, `rooms`, `options`
- **NEVER** use raw SQL strings in application code. Use Drizzle ORM or the existing repository pattern.
- **Column naming**: `platform_version` (not `campops_version` — renamed in rebrand)

---

## 12. Environment Variables (Key)

| Variable                  | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_DOMAIN` | Base domain (`sinaicamps.com`)                          |
| `NEXT_PUBLIC_API_URL`     | Internal API base URL                                   |
| `DATABASE_URL`            | SQLite path (`file:./sinaicamps.db`)                   |
| `BETTER_AUTH_SECRET`      | Auth session signing secret                             |
| `STRIPE_SECRET_KEY`       | Stripe API key                                          |
| `MAILGUN_API_KEY`         | Mailgun API key (for `email` MCP + transactional email) |
| `MAILGUN_DOMAIN`          | Mailgun sending domain                                  |

See `.env.example` for the complete list.

---

## 13. Agent Behaviour Rules

1. **Read `BLUEPRINT.md`** before making structural architecture decisions.
2. **Use `sequential-thinking` MCP** for complex multi-step tasks — plan before coding.
3. **Use `playwright` MCP** to verify UI behaviour before marking a task done.
4. **Use `sqlite` MCP** to verify database state during debugging.
5. **Use `lighthouse` MCP** to audit performance after significant UI changes.
6. **Never break passing tests.** If a change causes a test failure, fix it before continuing.
7. **Always scope DB queries by `site_id`.** Cross-tenant data leaks are a critical security failure.
8. **Log clearly.** Use `console.error` for errors, `console.log` only in development.
9. **No hardcoded branding.** Use `process.env.NEXT_PUBLIC_BASE_DOMAIN` — not `'sinaicamps.com'` literals.
10. **Commit clean.** Never commit: `*.log`, `*.db`, `test-results/`, `playwright-report/`, `screenshots/`, `.playwright-mcp/` — all covered by `.gitignore`.

---

## 14. Platform Status (Phase 13 — 2026-05-22)

**All known issues resolved. Platform is production-ready.**

| Issue                                                                        | Severity    | Status                                                                          |
| ---------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Guest booking blocked — CSRF fails for unauthenticated users                 | 🔴 Critical | ✅ Fixed — middleware only validates when cookie exists                         |
| No "Book Now" button for guests (unauthenticated)                            | 🔴 Critical | ✅ Fixed — redirects to login then back to checkout                             |
| PWA manifest 404 on main domain                                              | 🟠 High     | ✅ Fixed — rewrite rule in next.config.mjs                                      |
| 4 of 5 locales crash — missing translation files                             | 🟠 High     | ✅ Fixed — translation files created with English fallback                      |
| Homepage missing featured listings and categories                            | 🟠 High     | ✅ Fixed — 3 featured properties + categories seeded                            |
| Audit logging not recording (0 records)                                      | 🟠 High     | ✅ Fixed — all mutation routes instrumented                                     |
| Metrics endpoint returns empty                                               | 🟡 Medium   | ✅ Fixed — counters added to Node.js-side route handlers                        |
| Rate limiter returns 503, should return 429                                  | 🟡 Medium   | ✅ Fixed — status code corrected, X-RateLimit headers added                     |
| Staff session staleness on maintenance pages                                 | 🟡 Medium   | ✅ Fixed — updateAge added to better-auth config                                |
| React hydration warning in BookingFallback                                   | 🟢 Low      | ✅ Fixed — clientDefaults pattern for SSR-safe defaultValue                     |
| Cross-system E2E failure — dbSlots from disabled plugins                     | 🔴 Critical | ✅ Fixed — filter by enabledPluginSet                                           |
| Production build fails — missing exports, deps, dynamic flags                | 🔴 Critical | ✅ Fixed — all build errors resolved                                            |
| Lighthouse a11y failures — color contrast, form labels, lang                 | 🟡 Medium   | ✅ Fixed — all three pages at 100 a11y score                                    |
| `is_featured` set by SQL with no UI control                                  | 🟠 High     | ✅ Fixed — master dashboard has "Homepage Feature" toggle with display-order    |
| `--listing-*` CSS vars duplicated `--tenant-*` system                       | 🟡 Medium   | ✅ Fixed — unified to `--tenant-*`; `single-listing.tsx` is the sole template  |
| `ThemeLoader` existed but was never called by any page                       | 🟡 Medium   | ✅ Fixed — `stay/[slug]/page.tsx` now resolves template via `ThemeLoader`       |

**Scores: 187/187 E2E tests passing · Clean production build · 100/100 Lighthouse a11y/BP/SEO**
