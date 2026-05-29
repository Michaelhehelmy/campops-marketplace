# SinaiCamps Platform — Documentation Index

> Complete reference for deploying, configuring, and extending the SinaiCamps multi-tenant hospitality marketplace under your own brand and domain.

---

## Start Here

```
New to the platform?
  │
  ├─ Running locally?  ──────────────► getting-started.md
  │
  ├─ Deploying to production? ───────► DEPLOYMENT.md
  │                                        └─ then: cloudflare_config.md
  │
  ├─ Changing branding/name? ────────► customization.md
  │
  ├─ Building a plugin? ─────────────► plugin-development-guide.md
  │                                        └─ then: plugins/hook-catalog.md
  │
  └─ Understanding the architecture? ► ../FRAMEWORK.md
```

---

## All Documents

### Setup & Deployment

| Document                                     | Description                                 |
| -------------------------------------------- | ------------------------------------------- |
| [getting-started.md](getting-started.md)     | Local development — clone, configure, run   |
| [DEPLOYMENT.md](DEPLOYMENT.md)               | Production server deployment (any Linux VM) |
| [cloudflare_config.md](cloudflare_config.md) | Cloudflare DNS, SSL certificates, Pages     |

### Platform Configuration

| Document                                   | Description                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| [customization.md](customization.md)       | Brand colors, logo, fonts, site name, white-labeling |
| [owner-onboarding.md](owner-onboarding.md) | Property owner self-registration flow and plans      |

### Plugin Development

| Document                                                             | Description                                         |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| [plugin-development-guide.md](plugin-development-guide.md)           | Full guide: structure, DB, UI slots, hooks, testing |
| [plugins/hook-catalog.md](plugins/hook-catalog.md)                   | All hook events with payload shapes and examples    |
| [plugins/plugin-development.md](plugins/plugin-development.md)       | Supplemental plugin reference                       |
| [plugins/submission-guidelines.md](plugins/submission-guidelines.md) | Standards for submitting plugins to the registry    |

### Architecture & Internals

| Document                           | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| [../FRAMEWORK.md](../FRAMEWORK.md) | Core framework: schema, Plugin API, middleware, hooks |
| [../TESTING.md](../TESTING.md)     | Test suite guide (Vitest + Playwright, 1177+ tests)   |

### Release & History

| Document                                   | Description                   |
| ------------------------------------------ | ----------------------------- |
| [RELEASE_NOTES.md](RELEASE_NOTES.md)       | Changelog and version history |
| [ENHANCEMENT_PLAN.md](ENHANCEMENT_PLAN.md) | Roadmap and planned features  |

---

## Key Concepts

### Tenant

A property (camp, hotel, lodge, resort) registered on the platform. Each tenant has:

- A unique `slug` (used in URLs and API calls)
- An optional custom domain
- Its own plugin set
- A branded shop frontend served by the Next.js app under its own slug

### Plugin

A self-contained module in the `plugins/` directory. Each plugin:

- Has its own database tables (prefixed `plugin_<id>_`)
- Registers its own API routes under `/api/<plugin-routes>`
- Can inject UI components into named slots (e.g., `dashboard.top`, `listing.sidebar`)
- Can hook into platform events (bookings, payments, pricing, etc.)

### Shop Frontend

Each tenant's shop frontend is served by the same Next.js server via the catch-all route `/[locale]/[tenantSlug]/[[...slug]]`. Branding and theme settings are loaded at runtime from the database — no separate build step required. The `templates/shop-frontend/` directory contains the starter template used during initial scaffolding.

### Master Admin

The platform-level admin panel at `/en/admin`. Only accessible to users with the `master` role. Manages tenants, plugins, platform stats, and user accounts.

---

## Environment Variables Reference

### Required for all deployments

| Variable                  | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | Random 32+ char secret for session signing              |
| `NEXT_PUBLIC_BASE_DOMAIN` | Your marketplace domain (e.g. `yourdomain.com`)         |
| `NEXT_PUBLIC_API_URL`     | Full URL of the API (e.g. `https://api.yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL`     | Full URL of the app (e.g. `https://yourdomain.com`)     |
| `DATABASE_URL`            | SQLite path (e.g. `file:./sinaicamps-prod.db`)             |
| `AUTH_TRUST_HOST`         | Set to `true` when running behind a proxy               |
| `TRUSTED_ORIGINS`         | Comma-separated list of allowed origins for auth        |

### Optional

| Variable   | Description                   |
| ---------- | ----------------------------- |
| `PORT`     | HTTP port (default: `3000`)   |
| `NODE_ENV` | `development` or `production` |

---

## Platform URL Map

| Path                              | Description                 | Auth required     |
| --------------------------------- | --------------------------- | ----------------- |
| `/en`                             | Marketplace homepage        | No                |
| `/en/search`                      | Property search             | No                |
| `/en/login`                       | Login page                  | No                |
| `/en/list-your-space`             | Owner registration          | No                |
| `/en/admin`                       | Master admin panel          | Yes (master role) |
| `/en/manage/[id]`                 | Property owner dashboard    | Yes (owner/staff) |
| `/en/guest`                       | Guest portal                | Yes (guest role)  |
| `/api/health`                     | Health check                | No                |
| `/api/branding?slug=<slug>`       | Tenant branding JSON        | No                |
| `/api/tenant/resolve?host=<host>` | Tenant resolution           | No                |
| `/api/auth/*`                     | Better Auth endpoints       | —                 |
| `/api/plugins/*`                  | Plugin management           | Yes (master)      |
| `/api/master/*`                   | Platform stats & management | Yes (master)      |

---

## User Roles

| Role      | Access                                                      |
| --------- | ----------------------------------------------------------- |
| `master`  | Full platform admin — all tenants, all plugins, all data    |
| `manager` | Property management — their own property only               |
| `staff`   | Operations — limited to their property, no finance/settings |
| `guest`   | Guest portal — their own bookings and profile only          |

---

## Scripts Reference

| Script                                         | Description                                                |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `scripts/build-shop.sh <slug> <env> <api-url>` | Build a tenant's branded shop frontend (legacy — frontends now served by Next.js) |
| `scripts/fix-standalone.sh`                    | Fix Next.js standalone build (install missing native deps) |
| `scripts/deploy-prod.sh`                       | Run on server: restart PM2, reload Nginx                   |
| `scripts/seed-property.js`                     | Add a new tenant property to the database                  |

---

## Troubleshooting Quick Reference

| Symptom                               | Likely cause                                  | Fix                                                          |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `Invalid origin` on login             | `TRUSTED_ORIGINS` missing your domain         | Add domain to `TRUSTED_ORIGINS`, restart with `--update-env` |
| `localhost:3000` in auth requests     | `NEXT_PUBLIC_APP_URL` not set                 | Add to `.env.production`, rebuild                            |
| 522 error (Cloudflare)                | Port 80/443 blocked on server                 | Open ports in cloud firewall AND iptables                    |
| 526 error (Cloudflare)                | SSL cert invalid or incomplete                | Append Cloudflare CA root to `fullchain.pem`                 |
| `Cannot find module 'better-sqlite3'` | Native module compiled for wrong Node version | Run `npm rebuild better-sqlite3` on server                   |
| API subdomain returns HTML            | Cloudflare cached the SPA                     | Purge cache in Cloudflare dashboard                          |
| PM2 shows `errored`                   | Missing `node_modules` in standalone          | Run `bash scripts/fix-standalone.sh` before deploying        |
