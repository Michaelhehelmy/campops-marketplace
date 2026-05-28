# OpenCode Agent Prompt: Implementation Gap Audit

## Mission

Do a deep-dive analysis of the entire codebase and produce an honest, prioritized list of everything that is **stubbed, partially implemented, missing, or wired to mock data**. This is a discovery + reporting task — not a fix session. Fix only items explicitly marked FIX below. Everything else goes into the report.

**Read before starting:**
- `AGENT_LOGBOOK.md` — all entries
- `docs/DOCS_UPDATE_REPORT.md` — what was recently changed

**Test baseline must not regress:**
```bash
npm test && npx playwright test --reporter=list 2>&1 | tail -3
# 1177 unit | 376 E2E — both must stay green
```

---

## Phase 1 — Automated Discovery

Run every scan below and save raw output. These are your starting dataset — do not rely on memory or assumptions.

### 1.1 Code-level stubs

```bash
# Hardcoded mock/placeholder values in API routes
grep -rn "pm_placeholder\|sk_test_mock\|mock\|dummy\|fake\b\|stub\b" \
  src/app/api/ plugins/ --include="*.ts" -i \
  | grep -v "\.test\.\|\.spec\.\|//" | sort

# Routes returning empty arrays as real data (not error cases)
grep -rn "return NextResponse.json\(\[\]\)" src/app/api/ --include="*.ts"

# Routes returning 501 Not Implemented
grep -rn "501\|not.*implemented" src/app/api/ --include="*.ts" -i | grep -v "//"

# Hardcoded IDs / test values leaking into production code
grep -rn "master-admin\|test-tenant\|test-listing\|localhost:3000\b" \
  src/app/api/ src/lib/ --include="*.ts" | grep -v "\.test\.\|\.spec\.\|//"
```

### 1.2 Plugin implementation depth

For every plugin directory, measure real implementation depth:

```bash
echo "Plugin | index lines | route files | hook registrations | ui components"
echo "-------|------------|-------------|-------------------|---------------"
for plugin in plugins/*/; do
  name=$(basename "$plugin")
  idx=$(wc -l < "$plugin/src/index.ts" 2>/dev/null || echo 0)
  routes=$(find "$plugin/src" -name "routes.ts" -o -name "*.route.ts" 2>/dev/null | wc -l)
  hooks=$(grep -c "onAction\|onFilter\|hooks\." "$plugin/src/index.ts" 2>/dev/null || echo 0)
  ui=$(find "$plugin/src" -name "*.tsx" 2>/dev/null | wc -l)
  echo "$name | $idx | $routes | $hooks | $ui"
done
```

Then read the actual `src/index.ts` for every plugin with `index < 80 lines` — those are almost certainly stubs.

### 1.3 PluginShell slots with no registered content

```bash
# Find every PluginShell slot name used in the app
grep -rn 'PluginShell.*name=' src/app/ --include="*.tsx" | \
  grep -oP 'name="[^"]*"' | sort -u

# Cross-reference: which plugins actually register UI for these slots
grep -rn "registerUI\|registerSlot\|slot:\|\"slot\"\|'slot'" plugins/ --include="*.ts" --include="*.tsx" | \
  grep -v "\.test\." | sort -u
```

Any `PluginShell` slot used in the app with no plugin registering content = **dead UI slot**.

### 1.4 API routes with stub responses

Read every API route file and check if the handler contains real DB queries or returns hardcoded data:

```bash
# Routes that never query the database
for route in $(find src/app/api -name "route.ts" | sort); do
  if ! grep -q "db\.\|getSqlite\|DrizzleDB\|prepare\|query\|select\|insert\|update\|delete" "$route"; then
    echo "NO DB: $route"
  fi
done
```

### 1.5 Email system completeness

```bash
cat src/lib/email.ts

# Check if SMTP env vars are documented
grep -n "SMTP\|MAIL\|EMAIL\|RESEND\|SENDGRID\|MAILGUN" .env.example | head -20

# Find all places email is sent
grep -rn "EmailService.send\|sendEmail\|email.*send" src/ plugins/ --include="*.ts" -i | \
  grep -v "\.test\.\|//" | head -20
```

### 1.6 Payment system completeness

```bash
# Paymob (primary payment gateway)
cat plugins/paymob/src/index.ts
find plugins/paymob/src -name "*.ts" | xargs wc -l | sort -rn

# Stripe Connect (marketplace commissions)
cat src/app/api/payments/connect/route.ts | head -40
cat src/app/api/payments/stripe/ -r 2>/dev/null | head -5 || echo "no stripe dir"

# Registration plan payment — check for pm_placeholder
grep -n "pm_placeholder\|stripe_payment\|paymob\|payment" \
  src/app/\[locale\]/list-your-camp/plan/page.tsx
```

### 1.7 Notification system

```bash
# What notification events are wired?
grep -rn "sendNotification\|notify\|notification\|push.*notif\|web-push\|fcm\|apns" \
  src/ plugins/ --include="*.ts" -i | grep -v "\.test\.\|//" | head -20

# Admin settings notification tab — what does it actually save?
cat src/app/\[locale\]/admin/settings/page.tsx | grep -A 20 "notification\|Notification"
```

### 1.8 Search functionality

```bash
# What does the search API actually do?
cat src/app/api/search/route.ts 2>/dev/null || find src/app/api -name "*.ts" | xargs grep -l "search" | head -5

# Does the search page use real filters?
grep -n "filter\|category\|price\|amenity\|guests" \
  src/app/\[locale\]/search/page.tsx | head -20
```

### 1.9 Review / rating system

```bash
grep -rn "review\|rating\|star\|stars\b" src/ plugins/ --include="*.ts" --include="*.tsx" | \
  grep -v "\.test\.\|//" | grep -v "import\|//\|aria" | head -20
```

### 1.10 Staff management route

```bash
# This route was observed returning []
cat src/app/api/manage/\[listingId\]/staff/route.ts
```

---

## Phase 2 — Per-Surface Gap Analysis

After running all scans, categorize every gap found using this matrix:

### Gap severity

| Level | Definition |
|-------|-----------|
| **P0 — Broken** | Feature exists in UI but API returns error or mock data. Users are already encountering this. |
| **P1 — Stub** | Feature is visible in UI but backend has no real implementation (empty array, hardcoded value). |
| **P2 — Missing** | Feature is planned in docs/design but no UI or backend exists at all. |
| **P3 — Incomplete** | Feature works but has a specific known gap (e.g. payment flow works but no email confirmation). |
| **P4 — Cosmetic** | Feature works correctly but the UI state (empty state, loading state) is missing. |

---

## Phase 3 — Surface-by-Surface Report

Create `IMPLEMENTATION_GAP_REPORT.md` with this structure:

```markdown
# Implementation Gap Report — [DATE]

## Executive Summary
- P0 (Broken): X items
- P1 (Stub): X items
- P2 (Missing): X items
- P3 (Incomplete): X items
- P4 (Cosmetic): X items

---

## 1. Core Platform

### 1.1 Authentication
[findings]

### 1.2 Email System
[findings]

### 1.3 Search
[findings]

### 1.4 Reviews & Ratings
[findings]

### 1.5 Notifications
[findings]

---

## 2. Booking Flow

### 2.1 Booking creation
### 2.2 Payment integration (Paymob)
### 2.3 Payment integration (Stripe Connect)
### 2.4 Booking confirmation email
### 2.5 Cancellation flow
### 2.6 Refunds

---

## 3. Registration Wizard

### 3.1 Step 1 — Account
### 3.2 Step 2 — Property
### 3.3 Step 3 — Branding
### 3.4 Step 4 — Plan + Payment (pm_placeholder issue)
### 3.5 Step 5 — Success + auto-login

---

## 4. Owner Dashboard

### 4.1 Dashboard stats
### 4.2 Property settings & branding save
### 4.3 Custom domain setup & DNS verification
### 4.4 Revenue page (PluginShell — what renders?)
### 4.5 Bookings page (PluginShell — what renders?)

---

## 5. Manager Dashboard

### 5.1 Dashboard stats (CRM API)
### 5.2 Bookings CRUD
### 5.3 Rooms CRUD
### 5.4 Staff management
### 5.5 Guests/CRM
### 5.6 Finance/commissions
### 5.7 Housekeeping
### 5.8 Maintenance
### 5.9 Operations
### 5.10 POS/Orders

---

## 6. Guest Dashboard

### 6.1 Reservation list (real data?)
### 6.2 Reservation detail (cancel, invoice)
### 6.3 Orders
### 6.4 Following / saved properties
### 6.5 Loyalty points display

---

## 7. Tenant Website

### 7.1 Dynamic rooms from DB
### 7.2 Dynamic gallery from DB
### 7.3 Contact form submission
### 7.4 Booking CTA when plugin enabled/disabled
### 7.5 SEO (generateMetadata per page)

---

## 8. Admin Dashboard

### 8.1 Platform stats (real vs hardcoded)
### 8.2 Plugin marketplace (install/uninstall real?)
### 8.3 Commission reports (real data?)
### 8.4 System health details
### 8.5 User account management

---

## 9. Plugins — Implementation Depth

For each plugin, a row in a table:

| Plugin | Status | What works | What's stub | Priority |
|--------|--------|-----------|-------------|----------|
| booking | ✅ Core | Create, list, check-in/out | Refunds, availability calendar | P1 |
| loyalty | ... | ... | ... | ... |
| housekeeping | ... | ... | ... | ... |
| maintenance | ... | ... | ... | ... |
| pos-kds | ... | ... | ... | ... |
| ota-channel-manager | ... | ... | ... | ... |
| ... | | | | |

---

## 10. Infrastructure Gaps

### 10.1 File/image uploads
```bash
grep -rn "upload\|multer\|formData\|multipart\|S3\|cloudinary\|imagekit" \
  src/app/api/ --include="*.ts" -i | grep -v "\.test\.\|//" | head -10
```
Are property photos, logos, and gallery images actually uploadable to a storage service? Or do forms only accept URLs?

### 10.2 Background jobs
```bash
grep -rn "cron\|schedule\|queue\|worker\|bull\|agenda\|setInterval" \
  src/ plugins/ --include="*.ts" -i | grep -v "\.test\.\|//" | head -10
```
Which features need async processing (email sending, iCal sync, loyalty point calculation) — do they have background workers?

### 10.3 iCal sync
```bash
cat plugins/ical/src/index.ts
cat plugins/ical-import/src/index.ts
```
Is the iCal feed a real URL that external calendars (Google, Airbnb, Booking.com) can subscribe to? Is it actually generated from booking data?

### 10.4 OTA channel manager
```bash
cat plugins/ota-channel-manager/src/index.ts
cat plugins/siteminder/src/index.ts
```
Is this wired to any real OTA API (Booking.com, Airbnb, Expedia)? Or is it a stub?
```

---

## Phase 4 — FIX These Specific Items Now

Unlike the rest of this prompt (which is discovery), fix these **immediately** — they are P0 broken items observed in the pre-scan:

### FIX 1: `pm_placeholder` in registration plan step

**File:** `src/app/[locale]/list-your-camp/plan/page.tsx`

```bash
grep -n "pm_placeholder" src/app/\[locale\]/list-your-camp/plan/page.tsx
```

The plan step sends `stripe_payment_method_id: 'pm_placeholder'` for non-Basic plans. This means paid plan registration **silently succeeds without real payment**. 

Fix options (choose based on what's implemented):
- **Option A** (Paymob-first): Route non-Basic plan registration through Paymob checkout. After payment success callback, complete registration with the payment reference.
- **Option B** (Free-trial): Remove the placeholder, make all plans free-trial for now, and add a `plan_payment_status: 'trial'` field. Add a banner in the owner dashboard saying "Your trial ends in X days — add payment method."
- **Option C** (Stripe Elements): Render a real Stripe payment element for paid plans.

Read `plugins/paymob/src/index.ts` and `src/app/api/payments/` to determine which option is feasible with current implementation, then implement it.

### FIX 2: Staff management API returning `[]`

**File:** `src/app/api/manage/[listingId]/staff/route.ts`

Read the file. If the GET handler returns `[]` without querying the database:
```bash
cat src/app/api/manage/\[listingId\]/staff/route.ts
```

Implement the real query: fetch all users associated with the listing from the database where their role is `staff` or `manager`. Reference `src/app/api/manage/[listingId]/guests/route.ts` for the pattern.

### FIX 3: `sk_test_mock` Stripe key fallback

**File:** `src/app/api/payments/connect/route.ts` (line: `|| 'sk_test_mock'`)

This fallback means Stripe Connect calls will use a fake key in production if the env var is missing. Fix:
```typescript
// Replace:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {...})

// With:
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {...})
```

---

## Phase 5 — Priority Roadmap

After producing the full gap report, create a prioritized backlog section at the bottom of `IMPLEMENTATION_GAP_REPORT.md`:

```markdown
## Recommended Implementation Order

### Sprint 1 — P0 Fixes (this session)
- [ ] pm_placeholder → real payment in registration wizard
- [ ] Staff management API real query
- [ ] Stripe key fallback removed

### Sprint 2 — P1 Core Gaps (next priority)
- [ ] Email confirmation on booking creation
- [ ] Booking cancellation flow (guest-initiated)
- [ ] Owner dashboard revenue page — real data
- [ ] Owner dashboard bookings page — real data

### Sprint 3 — Plugin Completions
- [ ] Housekeeping — CRUD for tasks
- [ ] Maintenance — CRUD for requests
- [ ] POS/KDS — order creation + kitchen display
- [ ] iCal feed — real booking data export

### Sprint 4 — Advanced Features
- [ ] OTA channel manager — real API integration
- [ ] Review/rating system
- [ ] File upload (images, logos) — real storage
- [ ] Push notifications
- [ ] Loyalty — points earn/burn on booking

### Deferred (out of scope / third-party dependency)
- [ ] Airbnb/Booking.com direct API integration
- [ ] Revenue recognition / accounting automation
- [ ] Multi-currency real-time FX
```

---

## Commit

```bash
git add IMPLEMENTATION_GAP_REPORT.md \
  src/app/\[locale\]/list-your-camp/plan/page.tsx \
  src/app/api/manage/\[listingId\]/staff/route.ts \
  src/app/api/payments/connect/route.ts \
  AGENT_LOGBOOK.md

git commit -m "audit: implementation gap report + fix P0 items (pm_placeholder, staff API, Stripe fallback)"
```

---

## AGENT_LOGBOOK.md Entry

```markdown
## [DATE] — Implementation Gap Audit

### P0 Fixes Applied
- pm_placeholder: [what was done]
- Staff API: [what was done]  
- Stripe key fallback: removed, now throws if missing

### Key Findings (top gaps)
- [list the 5 most important gaps found]

### Deferred to roadmap
- [list sprints 2-4 items]
```
