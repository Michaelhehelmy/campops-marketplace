# SinaiCamps — Master Deep Audit Prompt

**Single prompt. All agents. Every surface. No stopping.**

---

## Mandatory Pre-Read

Before touching any file:

```bash
cat AGENT_LOGBOOK.md                     # all entries — know the gotchas
cat IMPLEMENTATION_GAP_REPORT.md         # what was built in Sprints 1-10
npm test 2>&1 | tail -3                  # baseline: 1319 tests
npx playwright test --reporter=list 2>&1 | tail -3   # baseline: ≥ 420 E2E
```

**Golden rules — never violate:**
- Plugin routes: `api.auth.getSession()` only — never core `requireSession`
- Plugin imports: all relative imports need `.js` extension (node16 moduleResolution)
- Logging: `api.logger.*` in plugins, `logger.*` in `src/` — never `console.log`
- DB: always use `DrizzleDatabaseWrapper.transaction()` — never bypass the queue
- Email: always fire-and-forget (`.catch(err => api.logger.error(...))`) — never await in request path
- Tests: never delete, skip, or weaken an existing passing test
- One commit per audit section; push after each commit

---

## What This Audit Covers

| # | Section | Scope |
|---|---------|-------|
| 1 | Core Platform | Middleware, auth, DB, plugin engine, hooks bus |
| 2 | Plugin Ecosystem | All 29 plugins — completeness, integration, hooks, API routes |
| 3 | Tenant System | Isolation, branding, routing, pages, custom domains |
| 4 | Frontend — All Roles | Every page for every role: public, guest, owner, manager, admin |
| 5 | API Surface | Every route — auth guards, input validation, error handling |
| 6 | Security | RBAC, CSRF, CSP, injection, rate limits, secrets, cookie signing |
| 7 | Cross-Plugin Integration | Hook firing, data flow, plugin-to-plugin dependencies |
| 8 | Test Coverage | Unit gaps, E2E gaps — write tests for everything uncovered |
| 9 | Performance | N+1 queries, missing indexes, cache misses, bundle size |
| 10 | Infrastructure | PM2 cluster, Nginx, health endpoint, metrics, backups |
| 11 | Documentation | Accuracy of all docs against current code |

---

## Section 1 — Core Platform

### 1.1 Middleware (`src/middleware.ts`)

Read the full file. Verify:
```bash
cat src/middleware.ts
```
- HMAC cookie verification: `verifySignedValue()` called for `sinaicamps_role` cookie
- CSP nonce injected on every response
- Protected routes reject unauthenticated requests with 401/403 (not 500)
- Public routes (`/api/public/*`, `/api/health`, `/api/metrics`, static files) bypass auth
- RTL: locale detection sets `dir` correctly
- Tenant routing: `[tenantSlug]` route resolves correctly for custom domains

**Test:** Run `npx playwright test e2e/tests/core/auth-gaps.spec.ts` — must pass.

### 1.2 Authentication (`src/lib/auth.ts`)

```bash
grep -n "socialProviders\|google\|emailAndPassword\|session\|cookie" src/lib/auth.ts | head -20
```
Verify:
- Email + password auth works
- Google OAuth configured (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Session cookie is HMAC-signed (`COOKIE_SIGNING_SECRET`)
- `BETTER_AUTH_SECRET` is used for JWT signing
- `TRUSTED_ORIGINS` includes all tenant domains

### 1.3 Database (`src/lib/db.ts`)

```bash
grep -n "_txQueue\|WAL\|PRAGMA\|journal_mode\|synchronous\|cache_size" src/lib/db.ts | head -20
```
Verify:
- `_txQueue` promise-chain serializes all transactions (SQLite race condition fix)
- WAL mode enabled: `PRAGMA journal_mode = WAL`
- `synchronous = NORMAL` for WAL
- `cache_size` and `temp_store` pragmas set for performance
- `DrizzleDatabaseWrapper` wraps all DB access — no raw `better-sqlite3` calls outside it

### 1.4 Plugin Engine

```bash
cat src/lib/PluginLoader.ts | head -60
cat src/lib/PluginBroker.ts | head -40
cat src/lib/plugin-watchdog.ts | head -40
cat src/lib/plugin-sandbox.ts | head -40
```
Verify:
- `PluginLoader.scan()` discovers all plugins via `plugin.json` manifests
- `PluginLoader.activate(id)` calls `init(api)` and registers routes
- `PluginLoader.deactivate(id)` unregisters routes, calls `teardown()` if exists
- `PluginBroker` delivers hook events in priority order
- `plugin-watchdog` records crashes and reports unhealthy plugins
- `plugin-sandbox` enforces capability declarations — plugin cannot call API it didn't declare

**Fix any gaps found. Write unit tests for any path with 0% coverage.**

---

## Section 2 — Plugin Ecosystem (All 29 Plugins)

For **every plugin** in `plugins/`, run this audit checklist:

```bash
for plugin in plugins/*/; do
  name=$(basename "$plugin")
  echo "=== $plugin ==="
  # 1. Has plugin.json with all required fields?
  cat "$plugin/plugin.json" 2>/dev/null | python3 -c "
import json,sys
p=json.load(sys.stdin)
required=['id','name','version','campopsVersion','capabilities']
missing=[k for k in required if k not in p]
print('MISSING FIELDS:', missing if missing else 'OK')
" 2>/dev/null || echo "MISSING plugin.json"
  # 2. Has init() exported from index.ts?
  grep -c "export default async function init" "$plugin/src/index.ts" 2>/dev/null || echo "NO init()"
  # 3. Any console.log leaks?
  grep -rn "console\.log\|console\.error" "$plugin/src/" --include="*.ts" | grep -v "\.test\." | wc -l | xargs echo "console.log count:"
done
```

### Required for every plugin:

| Check | Command | Must be |
|-------|---------|---------|
| `plugin.json` exists | `ls plugin.json` | ✅ |
| `id` matches directory name | grep `"id"` plugin.json | ✅ |
| `capabilities` declared | grep `capabilities` plugin.json | ✅ auth if routes exist |
| `init()` exported | grep `export default.*init` | ✅ |
| No `console.log` | grep -rn `console.log` src/ | 0 |
| Routes use `api.auth.getSession()` | grep auth routes | ✅ |
| Hook names use SDK constants | grep `Hooks\.` | ✅ |

### Per-plugin deep audit:

#### `plugins/booking`
- `BookingService.createBooking()` — full flow: validate → DB insert → fire `Hooks.BOOKING_CREATED` → send confirmation email → notify owner
- `BookingService.cancelBooking()` — validates ownership, 48h rule, fires `reservation:after_cancel`, sends cancellation email
- `BookingService.checkIn()` / `checkOut()` — status transitions, fire hooks, auto-create housekeeping task on checkout
- Availability query: does it correctly exclude overlapping bookings by date?
- Guest checkout (unauthenticated booking): does it create a guest record?
- **Run:** `npx playwright test e2e/tests/core/booking-operations.spec.ts`

#### `plugins/loyalty`
- Points earn: fired by `reservation:after_checkout` hook
- Points burn: applied during booking payment
- Tier upgrade logic: correct thresholds
- `GET /api/p/loyalty/balance/[guestId]` — returns real data from DB
- Guest dashboard loyalty widget shows correct points
- **Test:** create booking → checkout → verify points credited

#### `plugins/paymob`
- HMAC-SHA512 signature verification on webhook callback
- Transaction Inquiry call after payment
- Refund route exists and works
- `PAYMOB_HMAC_SECRET` used (not hardcoded)
- Sandbox vs production key detection
- **Run:** `npx playwright test e2e/tests/flows/payment-failures.spec.ts`

#### `plugins/reviews`
- One review per booking enforced (UNIQUE constraint on `booking_id`)
- Rating 1–5 validation (CHECK constraint)
- Status workflow: `pending` → `approved` | `rejected`
- Only approved reviews returned by public endpoint
- Average rating calculated from approved reviews only
- Manager can approve/reject from `/manage/[id]/reviews`
- **Test:** submit review → pending → approve → appears on listing

#### `plugins/upload`
- MIME type whitelist enforced (jpeg/png/webp only)
- File size limit enforced (5MB)
- Files saved to `public/uploads/[context]/`
- `public/uploads/` directory is gitignored but created on server
- URL returned is publicly accessible
- **Test:** upload valid image → url returned → accessible via browser

#### `plugins/housekeeping`
- `reservation:after_checkout` hook auto-creates cleaning task for the room
- CRUD endpoints: list/create/update/delete
- Status filter: `?status=pending|in-progress|done`
- Only manager/owner can delete tasks
- Staff can update status of assigned tasks
- UI at `/manage/[id]/housekeeping` renders correctly

#### `plugins/maintenance`
- CRUD endpoints complete
- Status workflow: `reported` → `in-progress` → `resolved`
- Photo attachment uses upload plugin
- Manager can assign to staff
- UI at `/manage/[id]/maintenance` renders correctly

#### `plugins/owner`
- Registration wizard step guards (can't skip steps)
- Free-trial model: no `pm_placeholder` anywhere
- `trial_ends_at` stored and displayed in owner dashboard
- Owner can see their plan status and upgrade CTA

#### `plugins/crm`
- `GET /api/p/crm/stats` returns real data (not hardcoded)
- Guest profiles tracked correctly
- Manager dashboard uses this or falls back to core stats API
- Tags and segments work

#### `plugins/ical`
- Public feed at `/api/public/ical/[propertyId]` — RFC 5545 format
- `VCALENDAR` + `VEVENT` per confirmed booking
- No auth required
- `DTSTART`/`DTEND` use correct exclusive end date format
- Subscription link shown in manager settings

#### `plugins/financial-ops`
- Commission calculation correct
- Manager finance page shows real data from this plugin
- Admin commission reports show correct totals

#### All stub plugins — verify or implement:
For `activities`, `accounting`, `hr-core`, `staff-roster`, `inventory-waste`, `pos-kds`, `marketing-automation`, `guest-crm`, `integrations`, `ota-channel-manager`, `siteminder`:

```bash
cat plugins/[name]/src/index.ts
```

For each:
- If it has real DB tables and routes → verify they work, add missing tests
- If it's a stub (< 50 lines, no real routes) → document it clearly in `plugin.json` with `"status": "stub"` and add a placeholder UI that says "Coming Soon — [Plugin Name]" instead of rendering empty

---

## Section 3 — Tenant System

### 3.1 Tenant routing

```bash
cat src/app/\[locale\]/\[tenantSlug\]/\[\[...slug\]\]/page.tsx
cat src/app/api/tenant/resolve/route.ts
cat src/app/api/tenant/serve/route.ts
```

Verify:
- Tenant slug resolves to correct property in DB
- Unknown slug → 404 (not 500)
- Correct pages render for each slug: `home`, `rooms`, `gallery`, `about`, `services`, `contact`
- Custom domain resolution: `X-Forwarded-Host` header used correctly via Nginx

### 3.2 Tenant isolation

**Critical:** one tenant must never see another's data.

```bash
npx playwright test e2e/tests/core/tenant-isolation.spec.ts
npx playwright test e2e/tests/core/multi-tenant-isolation.spec.ts
```

Verify in `src/app/api/` — every query that touches property data filters by `propertyId` that belongs to the authenticated user's listing. Any route that accepts `propertyId` in the query/body must verify the caller owns that property.

Test: log in as owner of property A → attempt to access property B's data → must get 403.

### 3.3 Tenant website pages

For each page component in `src/components/tenant/`:
```bash
ls src/components/tenant/
```

Verify each page:
- Fetches data from DB (not hardcoded)
- Handles empty state (no rooms, no gallery images, etc.) gracefully
- SEO: `generateMetadata()` returns `title` containing property name
- Branding: CSS variables from `api/tenant/serve` applied correctly
- Booking CTA: visible when booking plugin enabled, hidden when disabled

### 3.4 Tenant branding

```bash
cat src/app/api/tenant/serve/route.ts | head -60
cat src/app/api/branding/route.ts | head -40
```

Verify:
- CSS variables served correctly: `--color-primary`, `--color-secondary`, etc.
- Logo and hero image URLs resolve correctly
- Font family applied
- Owner branding changes reflected on tenant site without server restart

### 3.5 Custom domain setup

```bash
cat src/app/api/manage/\[listingId\]/domain/route.ts
cat src/app/api/owner/domains/check/route.ts 2>/dev/null
```

Verify:
- Domain verification flow exists (CNAME check or TXT record)
- `domain/verify` endpoint checks DNS resolution
- Nginx config handles wildcard `*.sinaicamps.com` and custom domains

---

## Section 4 — Frontend Role Audit

For **every page** across all roles, verify: loads without error, shows real data, primary action works, empty state handled, error state handled, loading state shown.

### 4.1 Public / Marketplace

| Page | URL | Verify |
|------|-----|--------|
| Homepage | `/en` | Featured listings from DB, search bar visible |
| Search | `/en/search?q=` | Results from `/api/public/search`, filters work, pagination |
| Listing detail | `/en/stay/[slug]` | Property data, rooms, reviews, booking CTA |
| Login | `/en/login` | Email + password + Google OAuth button |
| Registration wizard | `/en/list-your-camp` → success | All 5 steps, no `pm_placeholder` |

### 4.2 Guest Dashboard

| Page | URL | Verify |
|------|-----|--------|
| Dashboard | `/en/guest` | Upcoming reservations, loyalty points |
| Reservations | `/en/guest/reservations` | Real bookings from DB |
| Reservation detail | `/en/guest/reservations/[id]` | Cancel button (eligible only), review link (checked-out) |
| Orders | `/en/guest/orders` | Order history |
| Following | `/en/guest/following` | Saved properties |
| Profile | `/en/guest/profile` | Editable name/email |
| Settings | `/en/guest/settings` | Password change |
| Loyalty | `/en/loyalty` | Points balance, tier, history |

### 4.3 Property Owner Dashboard

| Page | URL | Verify |
|------|-----|--------|
| Dashboard | `/en/owner/dashboard` | Real stats: occupancy, revenue, upcoming bookings |
| Property settings | `/en/owner/property` | Loads saved data, can update |
| Branding | via settings | Logo upload (FileUpload component), colors |
| Plan | `/en/owner/plan` or upgrade | Current plan shown, upgrade path |
| Revenue | `/en/owner/revenue` | Real revenue data (not PluginShell empty) |
| Bookings | `/en/owner/bookings` | Real booking list (not PluginShell empty) |

### 4.4 Property Manager Dashboard

| Page | URL | Verify |
|------|-----|--------|
| Dashboard | `/en/manage/[id]` | Today's arrivals/departures, occupancy |
| Bookings | `/en/manage/[id]/bookings` | Full list, check-in/out actions |
| Rooms | `/en/manage/[id]/rooms` | CRUD for room types |
| Guests | `/en/manage/[id]/guests` | Guest list with search |
| Staff | `/en/manage/[id]/staff` | Real staff list (not empty `[]`) |
| Finance | `/en/manage/[id]/finance` | Commission data |
| Housekeeping | `/en/manage/[id]/housekeeping` | Task list, create task |
| Maintenance | `/en/manage/[id]/maintenance` | Request list, create request |
| Operations | `/en/manage/[id]/operations` | Plugin-driven content |
| Reviews | `/en/manage/[id]/reviews` | Pending reviews, approve/reject |
| Settings | `/en/manage/[id]/settings` | Property config, iCal URL |
| Posts | `/en/manage/[id]/posts/[type]` | CRUD for posts |

### 4.5 Master Admin Dashboard

| Page | URL | Verify |
|------|-----|--------|
| Dashboard | `/en/admin` | Platform stats (real) |
| Listings | `/en/admin/listings` | All properties |
| Listing detail | `/en/admin/listings/[id]` | Full property view |
| Listing config | `/en/admin/listings/[id]/config` | Per-listing plugin toggles |
| Accounts | `/en/admin/accounts` | All users, search |
| Plugins | `/en/admin/plugins` | Platform plugin catalog |
| Health | `/en/admin/health` | System health details |
| Commissions | `/en/admin/reports/commissions` | Commission totals |
| Settings | `/en/admin/settings` | Platform settings |
| Impersonation | admin → owner dash | Banner shows, stop works |

---

## Section 5 — API Surface Audit

### 5.1 Auth guard completeness

Every non-public API route must reject unauthenticated requests:

```bash
npx playwright test e2e/tests/core/auth-gaps.spec.ts
```

Additionally, run:
```bash
# Find routes with no auth check
for route in $(find src/app/api -name "route.ts" | grep -v "public\|health\|csrf\|metrics\|webhook\|ical" | sort); do
  if ! grep -q "getSession\|requireSession\|requireRole\|getServerSession\|auth\b" "$route"; then
    echo "NO AUTH: $route"
  fi
done
```

Fix every route flagged as having no auth check.

### 5.2 Input validation

Every POST/PATCH/PUT route must validate its body with Zod:

```bash
# Find routes that never call .parse() or .safeParse()
for route in $(find src/app/api -name "route.ts" | sort); do
  method=$(grep -c "async function POST\|async function PATCH\|async function PUT\|export.*POST\|export.*PATCH\|export.*PUT" "$route" 2>/dev/null || echo 0)
  zod=$(grep -c "\.parse\|\.safeParse\|z\." "$route" 2>/dev/null || echo 0)
  if [ "$method" -gt 0 ] && [ "$zod" -eq 0 ]; then
    echo "NO VALIDATION: $route"
  fi
done
```

For each route with no validation: add a Zod schema and `.safeParse()` call. Return 400 with error details on failure.

### 5.3 Error handling consistency

Every route must return structured JSON errors, never crash with a stack trace:

```bash
grep -rn "catch.*err\|catch.*e\b" src/app/api/ --include="*.ts" | grep -v "\.test\." | \
  grep -v "return NextResponse.json" | head -20
```

For any catch block that doesn't return a NextResponse: add proper error response.

### 5.4 Rate limiting

Verify rate limiting middleware applied to sensitive routes:
- Auth routes (`/api/auth/*`): 10 req/min
- Public search (`/api/public/search`): 30 req/min
- Upload (`/api/upload`): 10 req/min

```bash
grep -rn "rateLimit\|limit_req" src/app/api/ src/middleware.ts --include="*.ts" | head -15
```

---

## Section 6 — Security Deep Dive

### 6.1 Role escalation

```bash
npx playwright test e2e/tests/core/auth-escalation.spec.ts
```

Manual checks:
- Guest cannot access `/manage/*`, `/owner/*`, `/admin/*`
- Manager cannot access `/owner/*`, `/admin/*`
- Owner cannot access another owner's listing
- Staff cannot access Finance, Staff management, Plugin settings pages
- Master admin impersonation only available to `role = 'master'`

### 6.2 CSRF protection

```bash
grep -rn "csrf\|CSRF\|x-csrf-token" src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\.\|//" | head -15
```

Verify:
- All mutating requests from browser include CSRF token
- `/api/csrf-token` route exists and returns token
- Token verified server-side on POST/PATCH/DELETE
- E2E tests use `extractCsrf()` helper from `e2e/helpers/page-helpers.ts`

### 6.3 CSP headers

```bash
grep -n "Content-Security-Policy\|csp\b\|nonce" src/middleware.ts | head -10
```

Verify:
- Nonce injected per request
- `script-src` uses nonce (not `unsafe-inline`)
- `'unsafe-eval'` only present in development mode
- `connect-src` includes all API domains and WebSocket origins
- `img-src` includes `data:` and CDN domains

### 6.4 Secrets audit

```bash
# Check for any hardcoded secrets that should be env vars
grep -rn "sk_live\|sk_test_\|AKIA\|password.*=.*[\"'][^\"']\{8,\}" src/ plugins/ --include="*.ts" | \
  grep -v "\.test\.\|\.spec\.\|process\.env\|placeholder\|example"
```

Must return 0 results. Fix any hardcoded secret immediately.

### 6.5 SQL injection

All DB queries must use parameterized queries (no string interpolation):

```bash
grep -rn "db\.execute\|db\.query\|db\.run" src/ plugins/ --include="*.ts" | \
  grep "\${" | grep -v "\.test\." | head -10
```

Any query using `${variable}` string interpolation in SQL → replace with parameterized `$1, $2...` or Drizzle ORM operators.

---

## Section 7 — Cross-Plugin Integration

### 7.1 Hook delivery audit

Verify every hook fires and every subscriber receives it:

```bash
# All hooks fired across the codebase
grep -rn "hooks\.doAction\|hooks\.applyFilters\|fireHook" plugins/ src/ --include="*.ts" | \
  grep -v "\.test\.\|//" | sed 's/.*doAction(\([^,)]*\).*/\1/' | sort -u

# All hooks registered
grep -rn "hooks\.register\|onAction\|onFilter" plugins/ src/ --include="*.ts" | \
  grep -v "\.test\.\|//" | sort -u
```

Cross-reference: every hook that's fired must have at least one listener. Every registered hook must be fired somewhere. Dead hooks → document or remove.

### 7.2 Booking → Housekeeping integration

```bash
# Verify checkout hook creates cleaning task
grep -n "after_checkout\|CHECKOUT\|housekeeping\|cleaning" plugins/booking/src/ -r --include="*.ts"
grep -n "after_checkout\|CHECKOUT" plugins/housekeeping/src/ -r --include="*.ts"
```

Test end-to-end:
1. Create booking → check out guest
2. Verify housekeeping task created in `plugin_housekeeping_tasks` with `category = 'cleaning'`
3. Task visible in `/manage/[id]/housekeeping`

### 7.3 Booking → Loyalty integration

```bash
grep -n "loyalty\|points\|earn" plugins/booking/src/ -r --include="*.ts"
grep -n "CHECKOUT\|after_checkout\|earn\|points" plugins/loyalty/src/ -r --include="*.ts"
```

Test: checkout → verify loyalty points credited to guest account.

### 7.4 Booking → Email integration

```bash
grep -n "EmailService.send\|bookingConfirmation\|paymentReceipt" plugins/booking/src/ plugins/paymob/src/ -r --include="*.ts"
```

Verify fire-and-forget pattern used everywhere. If `await EmailService.send()` found without `.catch()` — fix it.

### 7.5 Plugin enable/disable state

When a plugin is disabled for a listing:
- Its API routes must return 404 or 403 (not 500)
- Its UI sections must not appear in the manager sidebar
- `PluginShell` slots it registers must render nothing (not crash)

```bash
npx playwright test e2e/tests/core/plugin-lifecycle.spec.ts
```

---

## Section 8 — Test Coverage

### 8.1 Current baseline

```bash
npm run test:coverage 2>&1 | grep -E "ERROR|statements|lines|functions|branches" | tail -8
```

**Required thresholds (must pass):**
- Statements: ≥ 70%
- Lines: ≥ 70%
- Functions: ≥ 75%
- Branches: ≥ 60%

### 8.2 Write tests for every file below threshold

```bash
npm run test:coverage 2>&1 | grep "|" | awk -F'|' '{
  gsub(/^[ \t]+|[ \t]+$/, "", $1);
  gsub(/^[ \t]+|[ \t]+$/, "", $2);
  if ($2+0 < 70 && $2 != "" && $2 != "% Stmts") print $2"% "$1
}' | sort -n | head -30
```

For each file below 70%: read the source, write tests covering uncovered branches.

### 8.3 E2E gaps

Run the full suite and identify any spec file with skipped or failing tests:
```bash
npx playwright test --reporter=list 2>&1 | grep -E "skipped|failed|SKIP|FAIL"
```

Unskip or fix every test. If a test is failing because the feature is genuinely broken — fix the feature.

### 8.4 Missing E2E flows

Write E2E tests for any flow not yet covered. Priority:
- Full booking flow: search → listing → book → confirmation → guest reservations → cancel
- Full review flow: checkout → review link → submit → manager approve → listing display
- Full registration wizard: account → property → branding → plan → success → owner dashboard
- Impersonation: admin → impersonate owner → see owner dashboard → stop → back to admin
- Tenant website: all pages render, booking CTA state matches plugin enabled/disabled

---

## Section 9 — Performance

### 9.1 N+1 query detection

```bash
grep -rn "for.*await\|\.map.*async\|\.forEach.*await" src/app/api/ plugins/ --include="*.ts" | \
  grep -v "\.test\.\|//" | head -20
```

Any `for...of` loop that does a DB query per iteration = N+1. Replace with single bulk query.

### 9.2 Missing indexes

```bash
# Check all queries that filter by non-indexed columns
grep -rn "WHERE\|where\b" src/ plugins/ --include="*.ts" | grep -v "\.test\.\|import" | \
  grep -v "id\b\|email\b\|slug\b\|status\b\|created_at" | head -20
```

For each unindexed filter column used frequently → add index in next migration.

### 9.3 Bundle size

```bash
npm run build 2>&1 | grep "First Load JS" | head -5
```

If First Load JS > 150kB for any route → investigate with `ANALYZE=true npm run build`.

### 9.4 Image optimization

```bash
grep -rn "<img\b" src/ --include="*.tsx" | grep -v "\.test\." | grep -v "next/image\|Image\b" | head -10
```

Replace any `<img>` that loads user-uploaded or external images with Next.js `<Image>` for automatic optimization.

---

## Section 10 — Infrastructure

### 10.1 PM2 cluster mode

```bash
cat ecosystem.config.js
```

Verify:
- `exec_mode: 'cluster'` (not `fork`)
- `instances: 'max'` (or specific number matching CPU cores)
- `max_memory_restart: '512M'`
- `exp_backoff_restart_delay: 100`

If `fork` mode: change to cluster, redeploy.

### 10.2 Nginx

```bash
cat nginx-unified.conf
```

Verify:
- `client_max_body_size 10M` (for file uploads)
- `proxy_set_header X-Forwarded-Host $host` (required for Better Auth)
- `proxy_set_header X-Real-IP $remote_addr`
- Rate limiting zones applied to `/api/auth/` and `/api/p/`
- SSL handled by Cloudflare (no SSL config in Nginx = correct)

### 10.3 Health endpoint

```bash
curl -s https://sinaicamps.com/api/health | python3 -m json.tool
```

Must return 200. Must include: `{ "status": "ok"|"degraded", "db": "ok", "plugins": {...} }`.

Verify: health returns 200 on warnings, 503 only on critical failure.

### 10.4 Metrics

```bash
curl -s -H "Authorization: Bearer $METRICS_TOKEN" https://sinaicamps.com/api/metrics | head -20
```

Must return Prometheus text format with counters and gauges.

### 10.5 Backups

```bash
cat scripts/backup-db.sh
ls -la backups/ 2>/dev/null || ssh ubuntu@84.235.239.6 "ls ~/marketplace/backups/ | tail -5"
```

Verify backup script exists, runs without error, produces timestamped `.db` files.

---

## Section 11 — Documentation Accuracy

Spot-check 5 key docs against source code reality:

```bash
# Hook catalog vs SDK
grep -rn "doAction\|applyFilters" plugins/booking/src/ plugins/loyalty/src/ --include="*.ts" | \
  grep -oP '"[a-z:_]+"' | sort -u
# Must match docs/plugins/hook-catalog.md

# Test counts in README
grep -n "1177\|1262\|1319\|tests" README.md | head -5
# Update to actual current count

# Database type in DEPLOYMENT.md
grep -n "PostgreSQL\|SQLite" docs/DEPLOYMENT.md | head -5
# Must say SQLite
```

Update any stale claim found.

---

## Output: Audit Report

Create `MASTER_AUDIT_REPORT.md` with this structure:

```markdown
# Master Deep Audit Report — [DATE]

## Test Baselines
- Unit: [X] tests, [X] files
- Coverage: statements [X]%, lines [X]%, functions [X]%, branches [X]%
- E2E: [X]/[X] passing

## Section Results

### Section 1 — Core Platform
| Check | Status | Notes |
|-------|--------|-------|
| Middleware HMAC | ✅/❌ | |
| Auth config | ✅/❌ | |
| DB WAL + _txQueue | ✅/❌ | |
| Plugin engine | ✅/❌ | |

### Section 2 — Plugin Ecosystem
| Plugin | Status | Gaps Found | Fixed |
|--------|--------|-----------|-------|
| booking | ✅ | | |
| loyalty | ✅/⚠️/❌ | | |
...

### Section 3–11
[same table format per section]

## All Bugs Found

| # | File | Bug | Fix Applied |
|---|------|-----|-------------|
| 1 | | | |

## All Tests Added

| File | Tests Added | Coverage Delta |
|------|------------|----------------|
| | | |

## Outstanding Issues (not fixed this session)

[list with priority]
```

---

## Commit Strategy

One commit per section completed:

```bash
git commit -m "audit(section-1): core platform — middleware, auth, DB, plugin engine"
git commit -m "audit(section-2): plugin ecosystem — [X] plugins audited, [Y] bugs fixed"
git commit -m "audit(section-3): tenant system — isolation, branding, routing"
git commit -m "audit(section-4): frontend — all role pages verified and fixed"
git commit -m "audit(section-5): API surface — auth guards, validation, error handling"
git commit -m "audit(section-6): security — RBAC, CSRF, CSP, secrets, SQL injection"
git commit -m "audit(section-7): cross-plugin integration — hooks, booking↔housekeeping↔loyalty"
git commit -m "audit(section-8): test coverage — [X] unit tests added, [Y] E2E tests added"
git commit -m "audit(section-9): performance — N+1 queries fixed, indexes added"
git commit -m "audit(section-10): infrastructure — PM2 cluster, Nginx, health, metrics, backups"
git commit -m "audit(section-11): documentation — hook catalog, test counts, architecture"
git commit -m "audit: MASTER_AUDIT_REPORT.md + AGENT_LOGBOOK.md update"

git push origin main
```

---

## Final Gate

All of these must be green before declaring the audit complete:

```bash
npm test 2>&1 | tail -3                              # ≥ 1319 passing, 0 failed
npm run test:coverage 2>&1 | grep "ERROR" | wc -l   # 0
npx playwright test --reporter=list 2>&1 | tail -3   # all passing
npm run build 2>&1 | grep -c "error"                 # 0
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l      # 0
curl -sf https://sinaicamps.com/api/health            # {"status":"ok"...}
```

---

## AGENT_LOGBOOK.md Entry

```markdown
## [DATE] — Master Deep Audit

### Sections Completed
- Section 1 (Core Platform): [findings]
- Section 2 (Plugins): [X plugins audited, Y bugs fixed]
- Section 3 (Tenants): [findings]
- Section 4 (Frontend): [X pages verified, Y bugs fixed]
- Section 5 (API): [X routes hardened]
- Section 6 (Security): [findings]
- Section 7 (Integration): [hook coverage findings]
- Section 8 (Tests): [+X unit, +Y E2E, coverage: statements X%]
- Section 9 (Performance): [N+1 fixes, indexes added]
- Section 10 (Infrastructure): [PM2 cluster: yes/no, health: ok]
- Section 11 (Docs): [X stale claims updated]

### New Persistent Gotchas
[any new discoveries]
```
