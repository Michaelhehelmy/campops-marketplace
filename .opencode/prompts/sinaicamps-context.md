# SinaiCamps — Project Context

**Project**: SinaiCamps Marketplace
**Developer**: Michael Helmy ([@Michaelhehelmy](https://github.com/Michaelhehelmy))
**Production**: https://sinaicamps.com — Oracle Cloud VM, PM2, Nginx, Cloudflare CDN
**Stack**: Next.js 14 App Router · better-auth · SQLite (sinaicamps.db) · Drizzle ORM · Hono · next-intl · Tailwind CSS v3

## What It Is
A white-label, multi-tenant hospitality marketplace — "WordPress for Rental Marketplaces".
- **sinaicamps.com** — public listing site (marketplace domain)
- **Tenant dashboards** — property managers manage their listing
- **Branded shopfronts** — custom subdomains or platform-provisioned domains

## User Roles
- `master` — full platform control
- `admin` — platform management
- `manager` — property owner, full listing control
- `staff` — day-to-day ops, no finance/settings/plugins
- `guest` — marketplace-only (sinaicamps.com): browse, book, favourites

## Tenant Plans
- `basic` — core listing, limited plugins
- `premium` — subdomain access, full plugins
- `ultimate` — custom domain (platform-provisioned), PWA, all plugins

## Architecture Principles
- Core is a thin framework. All business logic lives in plugins or themes.
- Hooks everywhere: `doAction` / `applyFilters` from `@/lib/hooks`
- Multi-tenant: every DB query scoped by `site_id` or `property_id`
- No hardcoded strings: use `process.env.NEXT_PUBLIC_BASE_DOMAIN`

## Key Files
- `src/lib/db.ts` — database connection + migrations
- `src/lib/PluginAPI.ts` — plugin API factory
- `src/middleware.ts` — tenant resolution, auth guard, CSRF
- `AGENTS.md` — full system rules
- `BLUEPRINT.md` — architecture decisions
