# Test Baseline — Phase 0

**Recorded**: 2026-05-18  
**Branch**: main (83da33d)  
**Purpose**: Pre-migration green baseline before Phase 1 schema changes.

---

## Unit / Integration (Vitest)

| Metric     | Count                              |
| ---------- | ---------------------------------- |
| Test files | 108 passed, 5 skipped (113 total)  |
| Tests      | 833 passed, 11 skipped (844 total) |
| Duration   | ~28s                               |

Run command: `npm run test:all`

---

## E2E (Playwright)

| Metric   | Count                            |
| -------- | -------------------------------- |
| Tests    | 137 passed, 0 failed             |
| Duration | ~8–10 min (sequential, 1 worker) |

Run command: `npx playwright test --reporter=list`

**Pre-existing issues fixed in this phase:**

1. `ultimate-redirect.spec.ts` — was failing because `redirect-check/route.ts` used
   automatic `localhost` detection (`NODE_ENV !== 'test'`) to suppress the `https://`
   redirect during dev. This caused the Playwright test (which expects the real
   `https://acaciacamp.com` redirect URL and intercepts it via `page.route()`) to receive
   `http://127.0.0.1:3000` instead.  
   **Fix**: Replaced automatic detection with explicit `FORCE_LOCAL_REDIRECT=true` env
   var opt-in. Set this env var in your `.env.local` during local development to keep
   the redirect on localhost.

2. `audit/frontend-functionality.spec.ts › 5. Console Error Collection` — was timing
   out under the 90s limit due to visiting 17 pages × 2000ms wait = 34s minimum, plus
   dev server cold-start latency.  
   **Fix**: Added `test.setTimeout(120000)` and reduced per-page wait to 500ms.

---

## Coverage (src/lib + src/app/api)

From last recorded coverage run (2026-05-17):

| Metric     | Value |
| ---------- | ----- |
| Statements | 60.2% |
| Lines      | 60.2% |
| Functions  | 73.1% |
| Branches   | 55.3% |

---

## Existing Schema (as of snapshot)

See `docs/schema_snapshot_20260518.sql` for the full SQLite schema dump.

**Core tables:**

- `users`, `sessions`, `accounts`, `verifications` — Better Auth
- `user_roles` — RBAC
- `properties` — tenants (to be supplemented by `sites` in Phase 1)
- `property_staff` — tenant staff assignments
- `property_plugins` — per-tenant plugin activations
- `available_plugins` — plugin registry
- `profiles` — user profiles

**Domain tables (created by plugins at runtime):**

- `plugin_booking_rooms`, `plugin_booking_bookings`, `plugin_booking_room_availability`
- `plugin_crm_activities`
- `plugin_financial_ops_commissions`
- `plugin_loyalty_*`
- `plugin_pwa_*`
- `plugin_resource_listings`
- `marketplace_bookings`, `commission_rates`, `commission_transactions` (deprecated core)
- `reservations`, `rooms`, `room_types` (deprecated core)
