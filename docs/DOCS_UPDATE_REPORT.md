# Documentation Update Report

**Date:** 2026-05-28

**Scope:** Sync all documentation to match current codebase implementation.

---

## Files Touched

### `docs/plugins/hook-catalog.md` — Complete rewrite
- 8 wrong hook names corrected (all were fictional names like `booking.created`, `guest.checked_out`)
- 3 fictional hooks removed
- All 21 real hooks documented with exact string values, payloads, and usage examples
- SDK constant names mapped to their string values
- Added booking-specific hooks (`BOOKING_CREATED`, `CHECKIN_COMPLETED`, `CHECKOUT_COMPLETED`, `BOOKING_CANCELLED`)
- Added plugin-specific hooks (`ical.sync_requested`, `ical:events_fetched`, `dashboard.get_stats`, `LISTING_CREATED`, `LISTING_UPDATED`, `PROPERTY_REGISTERED`)
- Added core system hooks table (11 framework-internal hooks)
- Added priority guidelines table

### `docs/DEPLOYMENT.md` — Multiple fixes
- PostgreSQL requirement removed (SQLite is the default production DB)
- Checklist now checks SQLite WAL mode instead of PostgreSQL
- Missing env vars added: `METRICS_TOKEN`, `COOKIE_SIGNING_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_IFRAME_ID`, `PAYMOB_INTEGRATION_ID`, `ANALYZE`
- Architecture diagram corrected (removed Cloudflare Pages Vite SPA)
- Phase 8 rewritten (tenant frontends served by same Next.js app)
- `NEXTAUTH_URL` → `BETTER_AUTH_URL`
- PostgreSQL note added as optional alternative
- Health check status codes documented

### `README.md` — Multiple fixes
- Test counts: 1102→1177 unit, 208→376 E2E (3 occurrences)
- Architecture diagram: removed Cloudflare Pages (tenant frontends in same Next.js app)
- `cd sinaicamps-marketplace` → `cd campops-marketplace`
- Tech stack: "Tenant Frontends" corrected, deployment simplified

### `docs/index.md` — Multiple fixes
- "Cloudflare Pages" → "Next.js app under its own slug"
- Shop Frontend section rewritten (runtime branding, no separate build)
- Test count: 1102+ → 1177+
- build-shop.sh script noted as legacy
- Troubleshooting entry for API subdomain HTML removed (no SPA anymore)

### `docs/getting-started.md` — Multiple fixes
- Clone URL corrected to `michaelhehelmy/campops-marketplace`
- Directory name corrected to `campops-marketplace`
- Step 6 rewritten: tenant frontend accessed via slug, not separate Vite SPA build

### `docs/plugin-development-guide.md` — Multiple fixes
- Import path: `sinaicamps-sdk` → `@sinaicamps/plugin-sdk`
- 3 hardcoded local file paths replaced with relative paths
- Wrong hook name `payment.on_success` → SDK constant `Hooks.PAYMENT_ON_SUCCESS`
- Added 3 new sections: `Authentication in Plugin Routes`, `Database Transaction Safety`, `Common Gotchas`
- plugin.json schema expanded with all required fields (`campopsVersion`, `capabilities`, `reviewStatus`)
- Documented `api.logger`, `.js` extensions, `_txQueue` serialization, `api.auth.getSession()` pattern

### `docs/development/plugins.md` — Added framework internals
- Added PluginLoader section (scan, activate, deactivate)
- Added PluginBroker section (cross-plugin event bus)
- Added plugin-watchdog section (crash recording, health reporting)
- Added plugin-sandbox section (capability enforcement)
- Added Transaction Safety section (`_txQueue` serialization)
- Corrected route examples to use `api.auth.getSession()`

### `docs/user-guides/property-owner.md` — Wizard step order
- Step order corrected: Account → **Property** → Branding → Plan → Success (was missing Property step entirely)
- Step count corrected from 4 to 5
- Property step details added (name, slug, location, currency, type)
- Branding step focused on visual identity (logo, images, colors)

### `docs/user-guides/master-admin.md` — Added missing sections
- Added **Impersonation** section with full flow documentation
- Added **Metrics & Monitoring** section with Prometheus metrics table
- Plugin management split into two levels: global (`/admin/plugins`) and per-property (`/admin/listings/[id]/config`)
- Build Queue section noted as legacy

---

## Stale Values Not Changed

The following files contain stale 1102/208 test counts and Cloudflare Pages references but are historical records, not user-facing docs:
- `AGENT_LOGBOOK.md`, `AGENT_AUDIT_FINDINGS.md`
- `PRODUCTION_READY_CERTIFICATION.md`, `PRODUCTION_AUDIT_SUMMARY.md`
- `PROMPT_*.md` (prompt files, not documentation)
- `PROMPT_DOCS_UPDATE.md` (work plan — already has correct 1177/376 targets)
