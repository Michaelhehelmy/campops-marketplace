## Goal
- Execute Sprints 5–10 in order: iCal feed, Dashboard stats, Housekeeping CRUD, Maintenance CRUD, Cancellation flow, Dynamic nav + loyalty widget

## Constraints & Preferences
- One commit per sprint
- `npm test` must stay ≥ 1208 after each sprint (currently 1262 passing)
- No stopping for permission

## Progress
### Done
- **Sprint 5** (commit `7b48800`): `src/app/api/public/ical/[propertyId]/route.ts` — public ICS export
- **Sprint 6** (commit `f96949ca`): `src/app/api/manage/[listingId]/dashboard/route.ts` — dashboard stats
- **Sprint 7** (commit `7bff4876`): Housekeeping plugin full CRUD — 18 tests
- **Sprint 8** (commit `1cc0d4d3`): Maintenance plugin full CRUD — 17 tests. Suite: 136 files, 1256 tests.
- **Sprint 9** (commit `30cb07f`): Cancellation flow — guest self-cancel, legacy reservations sync, 6 route tests. Suite: 136 files, **1262 tests**.

### In Progress
- Sprint 10: Dynamic navigation + loyalty widget

### Blocked
- (none)

## Key Decisions
- iCal route uses `getSqlite().prepare()` (sync better-sqlite3) matching search route pattern
- Dashboard stats route uses `db` from `@/lib/db` (DrizzleDatabaseWrapper) matching finance/properties route pattern — both patterns valid for their modules
- Plugin CRUD routes follow the `registerXxxRoutes(api)` pattern: calls `api.registerRoute()` for each path, receives the Request directly (auth via `api.auth.getSession()`), no Hono wrapper. Two paths per plugin: `/api/p/<name>` (list+create) and `/api/p/<name>/:id` (get+patch+delete).
- SQLite compatibility: use `datetime('now')`, `?` positional params, `crypto.randomUUID()`, no `RETURNING *`
- Cancel endpoint: guest role can cancel own booking (email ownership verified); staff/admin/master can cancel any. Legacy `reservations` table synced in same transaction.

## Next Steps
- Sprint 10: Dynamic navigation + loyalty widget

## Critical Context
- `src/test/setup.ts` global `afterEach` calls `db.resetMockStore()` — any test data seeded in `beforeAll` is wiped after every test; must use `beforeEach`/`afterEach` for test data
- `resetMockStore()` drops `plugin_booking_bookings` but does NOT recreate it — tests must `CREATE TABLE IF NOT EXISTS` in `beforeEach`
- Plugin auth MUST use `api.auth.getSession(req)`, not `requireSession` from core
- Plugin route handlers receive the raw `Request` object — extract ID from URL pathname segments
- `src/lib/__tests__/plugin-inits.test.ts` has integration tests for 8 plugins — uses `buildMockApi()` with `auth: { getSession: vi.fn() }`; after_checkout hook test verifies `api.db.execute` called

## Relevant Files
- `plugins/booking/src/api/routes.ts`: cancel endpoint at `/api/p/booking/:id/cancel` (POST) — guest self-cancel supported
- `plugins/booking/src/services/BookingService.ts`: `cancelBooking(id, guestEmail?)` — transaction with reservations sync
- `plugins/booking/__tests__/routes.test.ts`: 6 cancel endpoint tests
- `plugins/housekeeping/src/routes/housekeeping.ts`: template for plugin CRUD pattern
- `plugins/maintenance/src/routes/maintenance.ts`: template for plugin CRUD pattern
