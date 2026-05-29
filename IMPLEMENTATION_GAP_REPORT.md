# Implementation Gap Report

**Generated:** 2026-05-29  
**Scope:** Whole-codebase automated discovery scan  
**Note:** Many gaps from the original 2026-05-28 scan have been resolved in Sprints 4-10.

---

## Resolved Gaps (Sprints 4-10)

| Gap | Resolved In | Status |
|-----|------------|--------|
| **Search API** — `/api/public/search` missing | Sprint 4 (commit `1bd9913`) | ✅ Route exists with full-text LIKE, filters, pagination, 11 unit tests |
| **iCal export** — No public ICS endpoint | Sprint 5 (commit `7b48800`) | ✅ `GET /api/public/ical/[propertyId]` returns proper .ics |
| **Dashboard stats** — No aggregated stats API | Sprint 6 (commit `f96949c`) | ✅ `GET /api/manage/[listingId]/dashboard` with bookings/revenue/occupancy |
| **Housekeeping CRUD** — Skeleton only | Sprint 7 (commit `7bff487`) | ✅ Full CRUD: POST/GET/GET:id/PATCH/DELETE, 18 tests |
| **Maintenance CRUD** — Skeleton only | Sprint 8 (commit `1cc0d4d`) | ✅ Full CRUD: POST/GET/GET:id/PATCH/DELETE, 17 tests |
| **Cancellation flow** — No cancellation endpoint | Sprint 9 (commit `30cb07f`) | ✅ `POST /api/p/booking/:id/cancel` with guest self-cancel + staff/master cancel, 6 tests |
| **Manager sidebar** — No plugin-aware nav | Sprint 10 (commit `bbcb01b`) | ✅ Dynamic sidebar fetching enabled plugins from `/api/manage/:id/plugins/enabled` |
| **Loyalty dashboard** — No loyalty UI | Sprint 10 (commit `bbcb01b`) | ✅ Guest dashboard shows loyalty points + tier card |
| **File upload** — Missing plugin | Sprint 10 | ✅ `plugins/upload/` with `POST /api/p/upload/initiate`, E2E tests |
| **Reviews & ratings** — Missing plugin | Sprint 10 | ✅ `plugins/reviews/` with `POST /api/p/reviews` + listing reviews API, E2E tests |
| **Plugin manifests** — Missing capabilities | Sprint 10 | ✅ Fixed upload (auth+routes), loyalty (database+routes), accounting (database+routes), housekeeping (auth) |
| **Booking cancellation 500** — Null from transaction | Sprint 10 | ✅ Fixed null check in `BookingService.cancelBooking()` |
| **iCal E2E** — No test coverage | Sprint 10 | ✅ `e2e/tests/flows/ical-export.spec.ts` — auth guard + authenticated export + page load |
| **Search E2E** — No advanced search tests | Sprint 10 | ✅ `e2e/tests/flows/search-advanced.spec.ts` — filters, pagination, multi-filter combo |

---

## Remaining Gaps

### P1 — Must Have Before Launch
1. **Notification system** — no email queue, SMS, or push notification infrastructure beyond hook wiring
2. **Background job queue** — BullMQ mentioned in comments only, not wired up

### P2 — Core Experience
3. **Full-text search indexing** — current search uses `LIKE '%term%'`; no FTS5 or Elasticsearch
4. **Analytics dashboard** — `src/lib/metrics.ts` exists (prom-client) but routes not wired in
5. **Integration settings UI** — `settings.integrations` PluginShell slot has no registered UI
6. **OTA channel manager** — skeleton only (registers cron, no sync logic)

### P3 — Growth Features
7. **Siteminder full implementation** — adapter class exists but routes are stubs
8. **Main navigation items** — `nav.main` slot has no registered items
9. **Dashboard widgets** — `dashboard.*` PluginShell slots still empty
10. **OAuth connection flows** — no third-party OAuth infrastructure

### P4 — Polish
11. **Migration rollbacks** — missing for 008 and 011 (pre-013)
12. **`available_themes` empty** — themes exist on disk but not registered in DB
13. **`sites` missing `theme_id`** — referenced in BLUEPRINT design but column doesn't exist

---

## Critical Codebase Gotchas

- **Plugin capability source**: `PluginRuntimeService.readPluginCapabilities()` reads from `package.json` → `sinaicamps.capabilities`, NOT from `plugin.json`. Always check BOTH files.
- **`db.transaction()` returns null**: `src/lib/db.ts:473-478` catch block logs and returns null instead of rethrowing — every caller must check for null.
- **CSP `'unsafe-eval'` in dev**: Missing in dev mode causes silent JS failure (React never hydrates). Only affects local dev, not production.
- **Plugin test mocks**: Must include `auth: { getSession: vi.fn().mockResolvedValue(...) }` with session user role matching route expectations.
- **E2E dev server crash**: Full suite (362 tests) causes OOM after ~20min — 129 ECONNREFUSED failures. Not a test logic issue. Run subsets with `--grep` or `--grep-invert`.
