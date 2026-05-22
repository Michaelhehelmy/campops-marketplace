# SinaiCamps — Modular Hospitality Marketplace Platform

[![CI](https://github.com/michaelhehelmy/campops-marketplace/workflows/CI/badge.svg)](https://github.com/michaelhehelmy/campops-marketplace/actions)

> **Developed by [Michael Helmy](https://github.com/Michaelhehelmy)**

> A white-label, multi-tenant hospitality marketplace. One platform powers your public listing site, property owner dashboards, and fully branded tenant shop frontends — all driven by a plugin ecosystem you control.

---

## Architecture Overview

```
Browser
  │
  ├── marketplace.yourdomain.com  ──► Next.js Core (App Router)
  │                                      ├── /api/*          ← REST API
  │                                      ├── /[locale]/      ← Public pages
  │                                      ├── /admin          ← Master admin
  │                                      └── /manage/[id]    ← Owner dashboard
  │
  └── tenant.theirdomain.com  ──────► Cloudflare Pages (Vite SPA)
                                          └── API calls ──► api.yourdomain.com
```

**Clean Core principle:** the platform core handles only identity, tenant isolation, and plugin lifecycle. All business logic (bookings, POS, loyalty, HR) lives in self-contained plugins.

---

## Repository Structure

```
campops-marketplace/
├── src/                        # Core platform
│   ├── app/api/                # REST API routes
│   ├── app/[locale]/           # Marketplace UI pages
│   ├── lib/                    # Auth, DB, Plugin runtime
│   └── middleware.ts           # Tenant routing + auth guard
│
├── plugins/                    # Business logic modules
│   ├── booking/                # Reservations & room management
│   ├── loyalty/                # Guest points program
│   ├── ical/                   # Calendar sync (iCal)
│   ├── siteminder/             # OTA channel manager
│   └── ...                     # 25 modules
│
├── packages/
│   ├── plugin-sdk/             # TypeScript SDK for plugin authors
│   ├── plugin-starter/         # Starter template for new plugins
│   ├── plugin-testing/         # Test utilities & helpers
│   └── shared/                 # Shared hook definitions & constants
│
├── templates/
│   └── shop-frontend/          # React/Vite tenant shop template
│
├── scripts/                    # Build & deployment scripts
└── docs/                       # Full documentation (start here ↓)
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/michaelhehelmy/campops-marketplace.git
cd sinaicamps-marketplace
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — fill in BETTER_AUTH_SECRET, etc.

# 3. Start dev server
npm run dev
# → http://localhost:3000/en
```

Full setup guide: **[docs/getting-started.md](docs/getting-started.md)**

### Tests

```bash
npm run lint             # ESLint (must pass with 0 errors)
npm run format:check     # Prettier formatting check
npm run test             # All Vitest unit + integration tests
npm run test:coverage    # With coverage report
npm run test:e2e         # Playwright E2E (requires dev server)
npm run build            # Production build verification
```

**Current status:** 1070/1070 unit tests passing, 187/187 E2E tests passing, clean production build.

---

## Documentation

| Document                                                                   | What it covers                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [docs/index.md](docs/index.md)                                             | **Master index — start here**                          |
| [docs/getting-started.md](docs/getting-started.md)                         | Local development setup                                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                   | Production server deployment                           |
| [docs/cloudflare_config.md](docs/cloudflare_config.md)                     | Cloudflare DNS, Pages & SSL                            |
| [docs/customization.md](docs/customization.md)                             | Branding, theming & white-labeling                     |
| [docs/owner-onboarding.md](docs/owner-onboarding.md)                       | Property owner registration flow                       |
| [docs/plugin-development-guide.md](docs/plugin-development-guide.md)       | Building plugins                                       |
| [docs/plugins/hook-catalog.md](docs/plugins/hook-catalog.md)               | All available hooks & payloads                         |
| [FRAMEWORK.md](FRAMEWORK.md)                                               | Core framework internals                               |
| [TESTING.md](TESTING.md)                                                   | Test suite guide                                       |
| [docs/TEST_COVERAGE_REPORT.md](docs/TEST_COVERAGE_REPORT.md)               | Full coverage report + security/resilience findings    |
| [docs/PERFORMANCE_REPORT.md](docs/PERFORMANCE_REPORT.md)                   | Lighthouse + load test results                         |
| [docs/ACCESSIBILITY_REPORT.md](docs/ACCESSIBILITY_REPORT.md)               | WCAG 2.1 accessibility audit                           |
| [docs/FRONTEND_FUNCTIONALITY_TEST.md](docs/FRONTEND_FUNCTIONALITY_TEST.md) | Frontend interactive audit — all buttons, forms, links |

---

## Key Concepts

- **Tenant** — a property (camp, hotel, lodge) with its own slug, domain, and plugin set
- **Plugin** — a self-contained module with its own DB tables, API routes, and UI slots
- **PWA** — Dual service workers: marketplace SW (`sw-marketplace.js`) and tenant custom-domain SW (`sw-tenant.js`)
- **i18n** — 5 locales: English (en), Arabic (ar), French (fr), German (de), Russian (ru)
- **Guest Flow** — Unauthenticated users browse listings, redirected to login before booking, managed from guest dashboard on the main marketplace domain
- **Domain Provisioning** — Ultimate plan tenants get a platform-provisioned custom domain with full DNS + SSL management
- **Plugin Marketplace** — 25+ plugins across operations, revenue, guests, distribution, HR, admin, and infrastructure categories
- **Master Admin** — platform-level management at `/admin` (plugins, tenants, stats)
- **Better Auth** — authentication with email/password and session management

---

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Framework        | Next.js 14+ (App Router)                                 |
| Language         | TypeScript                                               |
| Database         | SQLite via `better-sqlite3` (swappable to PostgreSQL)    |
| Auth             | Better Auth                                              |
| Tenant Frontends | React + Vite + shadcn/ui                                 |
| Styling          | Tailwind CSS                                             |
| Testing          | Vitest + Playwright                                      |
| Deployment       | Oracle Cloud VM (backend) + Cloudflare Pages (frontends) |
| Process Manager  | PM2                                                      |
| Web Server       | Nginx (reverse proxy + SSL)                              |

---

## Plugin Categories

| Category     | Plugins                                                    |
| ------------ | ---------------------------------------------------------- |
| Operations   | `booking`, `housekeeping`, `maintenance`, `resource`       |
| Revenue      | `pos-kds`, `accounting`, `financial-ops`, `subscriptions`  |
| Guests       | `loyalty`, `guest-crm`, `crm`, `marketing-automation`      |
| Distribution | `siteminder`, `ical`, `ical-import`, `ota-channel-manager` |
| HR           | `hr-core`, `staff-roster`                                  |
| Admin        | `listing-admin`, `owner`, `activities`, `inventory-waste`  |
| Infra        | `pwa`, `test-dock`, `test-probe`                           |

---

## Architecture References

| Document                                               | What it covers                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                 | Agent system prompt — project rules, tech stack, directory map  |
| [BLUEPRINT.md](BLUEPRINT.md)                           | Master architecture document — read before structural decisions |
| [DOCS/DEPLOYMENT.md](DOCS/DEPLOYMENT.md)               | Production deployment guide with env checklist and rollback     |
| [QA-VERIFICATION-REPORT.md](QA-VERIFICATION-REPORT.md) | Full QA report with E2E results and Lighthouse scores           |

## Code Quality

```bash
npm run check          # format check + lint + tests
npm run format         # auto-format
npm run check:full     # full CI suite including E2E
```

See [TESTING.md](TESTING.md) for the full testing guide.  
**1070/1070 Vitest tests** (131 files) + **187/187 Playwright E2E tests**.  
**ESLint:** 0 errors, **Production build:** clean, **Lighthouse:** 100/100 A11y/BP/SEO.
See [docs/TEST_COVERAGE_REPORT.md](docs/TEST_COVERAGE_REPORT.md) for coverage breakdown, security findings, and resilience results.
