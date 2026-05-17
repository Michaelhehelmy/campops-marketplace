# CampOps — Modular Hospitality Marketplace Platform

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
│   └── ...                     # 15+ modules
│
├── packages/
│   └── plugin-sdk/             # TypeScript SDK for plugin authors
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
git clone https://github.com/your-org/campops-marketplace.git
cd campops-marketplace
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — see docs/getting-started.md

# 3. Start dev server
npm run dev
# → http://localhost:3000/en
```

Full setup guide: **[docs/getting-started.md](docs/getting-started.md)**

---

## Documentation

| Document | What it covers |
|----------|---------------|
| [docs/index.md](docs/index.md) | **Master index — start here** |
| [docs/getting-started.md](docs/getting-started.md) | Local development setup |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production server deployment |
| [docs/cloudflare_config.md](docs/cloudflare_config.md) | Cloudflare DNS, Pages & SSL |
| [docs/customization.md](docs/customization.md) | Branding, theming & white-labeling |
| [docs/owner-onboarding.md](docs/owner-onboarding.md) | Property owner registration flow |
| [docs/plugin-development-guide.md](docs/plugin-development-guide.md) | Building plugins |
| [docs/plugins/hook-catalog.md](docs/plugins/hook-catalog.md) | All available hooks & payloads |
| [FRAMEWORK.md](FRAMEWORK.md) | Core framework internals |
| [TESTING.md](TESTING.md) | Test suite guide |

---

## Key Concepts

- **Tenant** — a property (camp, hotel, lodge) with its own slug, domain, and plugin set
- **Plugin** — a self-contained module with its own DB tables, API routes, and UI slots
- **Shop Frontend** — a branded Vite SPA built from `templates/shop-frontend` for each tenant
- **Master Admin** — platform-level management at `/admin` (plugins, tenants, stats)
- **Better Auth** — authentication with email/password and session management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via `better-sqlite3` (swappable to PostgreSQL) |
| Auth | Better Auth |
| Tenant Frontends | React + Vite + shadcn/ui |
| Styling | Tailwind CSS |
| Testing | Vitest + Playwright |
| Deployment | Oracle Cloud VM (backend) + Cloudflare Pages (frontends) |
| Process Manager | PM2 |
| Web Server | Nginx (reverse proxy + SSL) |

---

## Plugin Categories

| Category | Plugins |
|----------|---------|
| Operations | `booking`, `housekeeping`, `maintenance` |
| Revenue | `pos`, `accounting`, `financial-ops` |
| Guests | `loyalty`, `guest-crm`, `marketing-automation` |
| Distribution | `siteminder`, `ical`, `ical-import` |
| HR | `hr-core`, `staff-roster` |

---

## Code Quality

```bash
npm run check          # lint + typecheck + tests
npm run format         # auto-format
npm run check:full     # full CI suite including E2E
```

See [TESTING.md](TESTING.md) for the full testing guide (337 tests, Vitest + Playwright).
