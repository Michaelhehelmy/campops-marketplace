# OpenCode Agent Prompt: Maximum Test Coverage Sprint

## Mission

Write unit tests and E2E tests until every meaningful code path is covered. Use tests to **prove the app works** — if a test fails because of a real bug, fix the bug, then keep going. Do not stop until:

1. `npm run test:coverage` passes all thresholds with **zero ERRORs**
2. `npx playwright test` passes **≥ 420 tests** (currently 376+61=437 registered, all must pass)
3. `npm run build` exits 0

**Read first:**
- `AGENT_LOGBOOK.md` — all entries
- `IMPLEMENTATION_GAP_REPORT.md` — what was built in Sprints 1–10
- `coverage/index.html` — open in browser to see exact uncovered lines

**Golden rules (same as always):**
- Tests in `src/` use `vi.mock()`, never real DB
- E2E tests use real dev server — always `loginAs()` via API, never UI login
- Never `waitForTimeout` — always explicit waits (`waitForResponse`, `waitForSelector`)
- Never weaken or delete an existing passing test
- One `git commit` per logical batch; push after each batch

---

## Phase 1 — Vitest Coverage: Fix thresholds first

### Step 1: Adjust excludes for infrastructure-only files

In `vitest.config.ts`, add to the coverage `exclude` array:
```typescript
'src/lib/redis-cache.ts',           // optional, no Redis in test env
'src/lib/bootstrap.ts',             // app init only
'src/lib/performance.ts',           // dev-mode perf monitoring
'src/lib/docs*.ts',                 // docs search
'src/lib/docs-utils.ts',
'src/lib/docs.ts',
'src/lib/slug.ts',                  // trivial one-liner
'src/lib/listeners/**',             // webpack/build dev listeners
'src/lib/plugin-sandbox.ts',        // tested via integration
'src/lib/tenant-context.tsx',       // React context, tested via E2E
'src/lib/listenerContext.tsx',
```

Run `npm run test:coverage` — check if thresholds now pass. If not, proceed to Step 2.

---

### Step 2: Unit tests for each 0%/low-coverage critical file

Work through these **in order**. For each: read the source file, write tests, run `npm test`, commit.

---

#### 2.1 `src/lib/auth-middleware.ts` (27.5%)

```bash
cat src/lib/auth-middleware.ts
```

Write `src/lib/__tests__/auth-middleware.test.ts`:
- `requireSession()` — returns session when valid cookie present
- `requireSession()` — throws/redirects when no session
- `requireRole('owner')` — passes when user has owner role
- `requireRole('owner')` — throws 403 when user has guest role
- `requireRole('master')` — passes for master admin
- All exported functions, all branches

---

#### 2.2 `src/lib/email.ts` (42.3%)

```bash
cat src/lib/email.ts
```

Write `src/lib/__tests__/email.test.ts`:
- `EmailService.send()` — calls transport when transport is set
- `EmailService.send()` — falls back to logger when no transport
- `EmailService.setTransport()` — custom transport is called with correct args
- `bookingConfirmationTemplate()` — returns HTML containing guestName, propertyName, checkIn, checkOut, bookingId
- `paymentReceiptTemplate()` — returns HTML with amount and paymentId
- `reviewRequestTemplate()` — returns HTML with reviewLink
- `newBookingNotificationTemplate()` — if it exists, test it too

---

#### 2.3 `src/lib/validate.ts` (41.6%)

```bash
cat src/lib/validate.ts
```

Write `src/lib/__tests__/validate.test.ts`:
- Every exported validator function
- Valid input → passes (no error thrown)
- Invalid input → throws with descriptive message
- Edge cases: empty string, null, undefined, extra-long strings, injection attempts

---

#### 2.4 `src/lib/cache.ts` (33.7%)

```bash
cat src/lib/cache.ts
```

Write `src/lib/__tests__/cache-coverage.test.ts` (may already exist partially):
- `get()` — cache miss returns null
- `get()` — cache hit returns stored value
- `set()` — stores value, retrievable by same key
- `del()` — removes key
- `clear()` — wipes all keys
- TTL expiry if implemented

---

#### 2.5 `src/lib/manageAuth.ts` (0%)

```bash
cat src/lib/manageAuth.ts
```

Write `src/lib/__tests__/manageAuth.test.ts`:
- All exported functions: happy path + error path
- Role verification: manager can access own listing, cannot access another's
- Staff restrictions if any

---

#### 2.6 `src/lib/tenant-provisioning.ts` (21.2%)

```bash
cat src/lib/tenant-provisioning.ts
```

Write `src/lib/__tests__/tenant-provisioning.test.ts`:
- `provisionTenant()` or equivalent — creates property, user, plan record
- Duplicate slug → returns error
- Missing required fields → validation error
- DB transaction failure → rolled back, no partial records

---

#### 2.7 `src/lib/email-tracking.ts` (34.5%)

```bash
cat src/lib/email-tracking.ts
```

Write `src/lib/__tests__/email-tracking.test.ts`:
- Track sent email: stores record in DB (or mock store)
- Mark email as opened (if webhook-based)
- `getTrackingStats()` if exists

---

#### 2.8 `src/lib/rateLimit.ts` (50.7%)

```bash
cat src/lib/rateLimit.ts
```

Write `src/lib/__tests__/rateLimit.test.ts`:
- First N requests pass
- (N+1)th request blocked with 429
- Window reset after TTL
- Different keys counted independently

---

#### 2.9 Plugin-level unit tests for new Sprint 1–10 plugins

For each plugin with `< 60%` coverage, write tests:

```bash
# Check which plugins are under-tested
npm run test:coverage 2>&1 | grep "plugins/" | awk -F'|' '{gsub(/ /,"",$2); if ($2+0 < 60) print $0}' | head -20
```

**For `plugins/reviews/`:**
- `POST /reviews` — creates review, returns 201
- `POST /reviews` — returns 400 if booking not CHECKED_OUT
- `POST /reviews` — returns 403 if guest doesn't own booking
- `POST /reviews` — returns 409 if review already exists for booking
- `GET /reviews/[propertyId]` — returns only approved reviews
- `PATCH /reviews/[id]` — manager can approve/reject
- `PATCH /reviews/[id]` — guest cannot approve/reject

**For `plugins/upload/`:**
- `POST /upload` — valid image → returns `{ url }`
- `POST /upload` — non-image MIME → 400
- `POST /upload` — oversized file → 400
- `POST /upload` — unauthenticated → 401/403

**For `plugins/housekeeping/`:**
- CRUD: create task, list tasks, update status, delete
- Hook: `reservation:after_checkout` creates cleaning task
- Status filter: `?status=pending` only returns pending tasks

**For `plugins/maintenance/`:**
- CRUD: create request, list, update status, delete
- Priority levels: low/medium/high
- Only manager/staff can update status

**For `plugins/booking/` cancellation:**
- `cancelBooking()` — sets status to CANCELLED
- `cancelBooking()` — returns error if check-in < 48h away
- `cancelBooking()` — guest can only cancel own booking
- `cancelBooking()` — null return from transaction is handled

---

### Step 3: API route unit tests for 0% coverage routes

Run this to list all route files with 0% coverage:
```bash
npm run test:coverage 2>&1 | grep "route.ts" | awk -F'|' '{gsub(/ /,"",$2); if ($2=="0") print $0}'
```

For each 0% route, check the actual path and write tests. Priority routes:

**`src/app/api/admin/impersonate/route.ts`** — master admin only, impersonates owner
- Valid impersonation → sets session, returns 200
- Non-master attempts → 403
- Unknown user ID → 404

**`src/app/api/admin/impersonate/stop/route.ts`**
- Clears impersonation session → returns 200
- No active impersonation → still returns 200 (idempotent)

**`src/app/api/manage/[listingId]/finance/route.ts`**
- Returns commission data for listing
- Non-manager access → 403

**`src/app/api/manage/[listingId]/plugins/enabled/route.ts`** (Sprint 10)
- Returns array of enabled plugin IDs
- Returns empty array for listing with no plugins enabled

**`src/app/api/owner/upgrade/route.ts`**
- Valid plan upgrade → updates plan in DB
- Invalid plan name → 400
- Non-owner → 403

**`src/app/api/owner/me/route.ts`**
- Returns current owner's property and plan info
- Unauthenticated → 401

**`src/app/api/admin/properties/[id]/route.ts`**
- GET — returns full property details (admin view)
- DELETE — soft-deletes or hard-deletes property
- Non-admin → 403

**`src/app/api/public/search/route.ts`** (Sprint 4)
- `?q=safari` → returns matching properties
- `?checkIn=&checkOut=` → excludes booked properties
- `?guests=4` → only rooms with capacity >= 4
- `?page=2` → returns second page of results
- `?category=camping` → filtered results
- Empty results → returns `{ listings: [], total: 0 }`

**`src/app/api/public/ical/[propertyId]/route.ts`** (Sprint 5)
- Returns `text/calendar` content-type
- VCALENDAR with VEVENT for each confirmed booking
- Unknown propertyId → 404

**`src/app/api/manage/[listingId]/stats/route.ts`** (Sprint 6)
- Returns `{ todayArrivals, todayDepartures, occupancyRate, monthRevenue, pendingTasks }`
- Non-manager → 403

---

### Step 4: Run coverage and verify thresholds clear

```bash
npm run test:coverage 2>&1 | tail -10
# Must show NO "ERROR: Coverage for..." lines
```

Target minimums after Phase 1:
- Statements: ≥ 70%
- Lines: ≥ 70%
- Functions: ≥ 75%
- Branches: ≥ 60%

Update `vitest.config.ts` thresholds to match reality (but never lower than what you achieve).

**Commit:**
```bash
git add src/lib/__tests__/ plugins/*/src/__tests__/ vitest.config.ts
git commit -m "test(coverage): unit tests for auth-middleware, email, validate, cache, manageAuth, all Sprint 1-10 APIs"
git push origin main
```

---

## Phase 2 — E2E: Cover Every User-Facing Page

### Current E2E gaps

These pages have **zero E2E test coverage**. Every page must have at least:
1. Unauthenticated access → correct redirect (not 500)
2. Authenticated access → page loads, shows real data (not empty, not error)
3. Primary action works (form submit, button click, etc.)

---

#### 2.1 Guest dashboard pages

**File:** `e2e/tests/flows/guest-dashboard.spec.ts` (create new)

```typescript
// Tests needed:
test('guest profile page loads with correct user data')
test('guest can update profile name and email')
test('guest settings page loads')
test('guest can change password')
test('guest orders page loads (empty state if no orders)')
test('guest following page loads (empty state if no follows)')
test('guest loyalty page loads and shows points balance')
test('guest reservation detail shows booking info')
test('guest can cancel eligible reservation')
test('guest cannot cancel reservation with check-in < 48h away')
test('guest sees review button on checked-out reservation')
test('guest can submit a review for checked-out reservation')
```

---

#### 2.2 Registration wizard — full end-to-end

**File:** `e2e/tests/flows/registration-wizard.spec.ts` (verify or create)

```typescript
test('step 1 (account) validates required fields')
test('step 1 submits and advances to step 2')
test('step 2 (property) validates slug uniqueness')
test('step 2 submits and advances to step 3 (branding)')
test('step 3 (branding) submits and advances to step 4 (plan)')
test('step 4 (plan) basic plan free-trial registers successfully')
test('step 4 (plan) paid plan shows payment form (not pm_placeholder)')
test('success page shows confirmation and dashboard link')
test('cannot access step 3+ without completing step 1+2')
```

---

#### 2.3 Owner dashboard pages

**File:** `e2e/tests/flows/owner-dashboard.spec.ts` (extend existing or create)

```typescript
test('owner dashboard shows real stats (arrivals, revenue, occupancy)')
test('owner property settings page loads with saved data')
test('owner can update property name and save')
test('owner can upload logo (uses file upload API)')
test('owner revenue page loads')
test('owner bookings page loads')
test('owner plan upgrade page loads with current plan highlighted')
test('owner can select a higher plan')
```

---

#### 2.4 Manager dashboard — comprehensive

**File:** `e2e/tests/flows/manager-full-flow.spec.ts` (extend or create)

```typescript
test('manager dashboard shows today stats')
test('manager bookings page lists reservations')
test('manager can create a booking manually')
test('manager can check in a reservation')
test('manager can check out a reservation — auto-creates housekeeping task')
test('manager guests page lists all property guests')
test('manager can search guests by name/email')
test('manager staff page lists staff members')
test('manager can add a staff member')
test('manager finance page loads with commission data')
test('manager housekeeping page lists tasks')
test('manager can create housekeeping task')
test('manager can mark task as done')
test('manager maintenance page lists requests')
test('manager can create maintenance request')
test('manager can update maintenance status to in-progress')
test('manager settings page loads')
test('manager can update settings and save')
test('manager reviews page shows pending reviews')
test('manager can approve a review')
```

---

#### 2.5 Admin dashboard — comprehensive

**File:** `e2e/tests/flows/admin-full-flow.spec.ts` (extend or create)

```typescript
test('admin dashboard shows platform stats')
test('admin listings page shows all properties')
test('admin can view listing detail')
test('admin can impersonate property owner')
test('impersonation shows banner in owner dashboard')
test('admin can stop impersonation and return to admin')
test('admin accounts page lists all users')
test('admin can search accounts by email')
test('admin plugins page shows all platform plugins')
test('admin can enable a plugin platform-wide')
test('admin can disable a plugin platform-wide')
test('admin per-listing config page shows plugin toggles')
test('admin health page shows system status')
test('admin reports/commissions page shows commission data')
test('admin settings page loads and saves')
```

---

#### 2.6 Tenant website pages

**File:** `e2e/tests/flows/tenant-website.spec.ts` (extend or create)

```typescript
test('tenant home page renders with branded colors and logo')
test('tenant rooms page lists rooms from DB')
test('tenant gallery page shows images')
test('tenant about page renders')
test('tenant services page renders')
test('tenant contact page renders with form')
test('tenant contact form submission works')
test('tenant booking CTA visible when booking plugin enabled')
test('tenant booking CTA absent when booking plugin disabled')
test('tenant SEO: page title contains property name')
test('tenant RTL: Arabic locale renders dir=rtl')
```

---

#### 2.7 Public marketplace pages

**File:** `e2e/tests/flows/marketplace-public.spec.ts` (extend or create)

```typescript
test('homepage loads with featured listings')
test('homepage search bar is visible')
test('search page: keyword search returns results')
test('search page: check-in/check-out filter works')
test('search page: guest count filter excludes small rooms')
test('search page: category filter narrows results')
test('search page: price range filter works')
test('search page: pagination works (page 2 shows different results)')
test('search page: empty results shows helpful message')
test('listing detail page loads with correct property data')
test('listing detail shows reviews (when approved reviews exist)')
test('listing detail shows average star rating')
test('listing detail book button navigates to booking form')
```

---

#### 2.8 Booking flow — complete

**File:** `e2e/tests/flows/booking-full.spec.ts` (extend or create)

```typescript
test('unauthenticated guest can see booking form')
test('booking form validates check-in < check-out')
test('booking form validates guest count ≤ room capacity')
test('authenticated guest can complete booking')
test('booking confirmation page shows booking ID')
test('booking confirmation email sent (mock or check logs)')
test('owner receives new booking notification email')
test('booked dates blocked in availability calendar')
test('booking shows up in guest reservations list')
test('booking shows up in manager bookings list')
```

---

#### 2.9 Reviews flow — full

```typescript
// In e2e/tests/flows/reviews.spec.ts (extend existing)
test('guest sees "Leave Review" button on checked-out reservation')
test('guest submits review with 5 stars and body text')
test('submitted review is pending (not visible on listing yet)')
test('manager approves review from reviews panel')
test('approved review appears on listing detail page')
test('approved review shows correct star rating')
test('guest cannot submit second review for same booking')
test('unauthenticated user cannot submit review')
```

---

#### 2.10 File upload flow

```typescript
// In e2e/tests/flows/file-upload.spec.ts (extend existing)
test('owner can upload a logo image in branding step')
test('uploaded logo URL is saved to property settings')
test('uploaded logo appears on tenant website')
test('file > 5MB is rejected with error message')
test('non-image file is rejected with error message')
test('unauthenticated upload attempt returns 401')
```

---

#### 2.11 iCal export

```typescript
// In e2e/tests/flows/ical-export.spec.ts (extend existing)
test('GET /api/public/ical/[propertyId] returns 200 with text/calendar')
test('iCal content contains VCALENDAR header')
test('iCal content contains VEVENT for each confirmed booking')
test('iCal DTSTART and DTEND match booking check-in/check-out')
test('unknown property ID returns 404')
test('no auth required for iCal endpoint')
test('manager settings page shows iCal URL with copy button')
```

---

#### 2.12 Maintenance flow

```typescript
// In e2e/tests/flows/maintenance-flow.spec.ts (create new)
test('manager can report a maintenance issue')
test('maintenance request appears in list with Reported status')
test('manager can assign request to staff member')
test('status update to In Progress persists')
test('status update to Resolved closes the request')
test('maintenance list filters by status work')
test('staff member can update their assigned request')
test('staff cannot delete a maintenance request')
test('manager can delete a maintenance request')
```

---

### Phase 2 commit strategy

After each batch of 2–3 test files:
```bash
npm test && npx playwright test --reporter=list 2>&1 | tail -3
git add e2e/tests/
git commit -m "test(e2e): [surface] full flow coverage"
git push origin main
```

---

## Phase 3 — Bug fixing during testing

If any test reveals a real bug (returns 500, wrong data, missing feature), fix it immediately:
1. Note the bug in the test failure message
2. Read the relevant source file
3. Apply the minimal fix
4. Re-run the test to verify
5. Run full suite to confirm no regressions
6. Commit the fix separately: `fix([scope]): [what was broken and how fixed]`

**Known patterns to watch for:**
- Routes that never query DB (return hardcoded `{}` or `[]`)
- Missing `await` on async DB calls
- Hooks that fire but do nothing (because handler throws silently)
- Pages that crash when plugin is disabled (check `PluginShell` fallback)
- Forms that submit but show no success/error feedback

---

## Phase 4 — Final verification

```bash
# Unit coverage — all thresholds green
npm run test:coverage 2>&1 | grep -E "ERROR|Coverage"

# Full E2E
npx playwright test --reporter=list 2>&1 | tail -5

# TypeScript
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # must be 0

# Build
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"

# No rogue console.log
grep -rn "console\.log" src/ plugins/ --include="*.ts" --include="*.tsx" | grep -v "\.test\.\|\.spec\.\|email\.ts" | wc -l
```

All must be clean.

---

## Final commit

```bash
git add -A
git commit -m "test: achieve full coverage — all thresholds pass, E2E covers every user flow

Unit tests:
- auth-middleware, email, validate, cache, manageAuth, tenant-provisioning
- All Sprint 1-10 API routes (reviews, upload, search, iCal, stats, housekeeping, maintenance, cancellation)
- Plugin-level CRUD tests for all new plugins

E2E tests:
- Guest dashboard: profile, settings, orders, following, loyalty, reservations, cancel, review
- Registration wizard: all 5 steps end-to-end
- Owner: stats, property edit, logo upload, plan upgrade
- Manager: bookings, check-in/out, guests, staff, finance, housekeeping, maintenance, reviews
- Admin: listings, impersonation, accounts, plugins, health, commissions
- Tenant website: all pages, booking CTA, SEO, RTL
- Marketplace: search filters, pagination, listing detail, reviews display
- Booking flow: complete creation → confirmation → email → guest/manager visibility
- Reviews: submit → pending → manager approval → listing display
- File upload: upload → save → display
- iCal: export format, content, auth-free access
- Maintenance: full status workflow"

git push origin main
```

---

## AGENT_LOGBOOK.md Entry

```markdown
## [DATE] — Full Coverage Sprint

### Test Results
- Unit tests: [X] passing ([X] files)
- Unit coverage: statements [X]%, lines [X]%, functions [X]%, branches [X]%
- E2E tests: [X]/[X] passing

### Bugs Found and Fixed During Testing
- [list each bug discovered + fix applied]

### Coverage Exclusions Added
- redis-cache.ts, bootstrap.ts, performance.ts, docs*.ts, slug.ts, listeners/
  Reason: infrastructure/optional dependencies not testable in unit test environment

### Coverage Thresholds Updated To
- statements: [X]%, lines: [X]%, functions: [X]%, branches: [X]%
```
