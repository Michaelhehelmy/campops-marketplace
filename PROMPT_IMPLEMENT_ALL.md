# OpenCode Agent Prompt: Full Feature Implementation Sprint

## Directive

Implement every P1, P2, and P3 item from `IMPLEMENTATION_GAP_REPORT.md` in order, without stopping to ask for permission. After each feature: run `npm test` (must stay ≥ 1177) and commit. If a test regresses, fix it before continuing.

**Read first:**
- `AGENT_LOGBOOK.md` — all entries
- `IMPLEMENTATION_GAP_REPORT.md` — full gap analysis
- `src/lib/email.ts` — EmailService already has transport + templates
- `plugins/booking/src/` — reference implementation for all plugin patterns

**Golden rules:**
- Never use `console.log` — use `api.logger.info()` in plugins, `logger.info()` in src/
- Never bypass `DrizzleDatabaseWrapper.transaction()` — always use the wrapper
- Plugin routes use `api.auth.getSession()` — never core `requireSession`
- All relative imports in plugin files need `.js` extension

---

## Sprint 1 — Email Notifications (P1)

The email infrastructure is 90% complete. `EmailService`, templates, and SMTP transport all exist in `src/lib/email.ts`. The gap is that `EmailService.send()` is never called when real events occur.

### 1.1 Wire booking confirmation email

**File:** `plugins/booking/src/api/routes.ts` (or wherever `BOOKING_CREATED` hook fires)

After a booking is successfully created, send a confirmation email:

```typescript
import { EmailService, bookingConfirmationTemplate } from '@sinaicamps/plugin-sdk'; 
// or import directly if not re-exported from SDK:
// import { EmailService, bookingConfirmationTemplate } from '../../../../src/lib/email.js';
```

Find the point where booking is committed to DB. After the insert, fetch the guest email + property name and call:

```typescript
await EmailService.send({
  to: guestEmail,
  subject: `Booking Confirmed — ${propertyName}`,
  html: bookingConfirmationTemplate({
    guestName,
    propertyName,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    bookingId: newBookingId,
  }),
});
```

**Do not block the booking response on email sending.** Fire-and-forget:
```typescript
EmailService.send({...}).catch(err => api.logger.error('Booking email failed', err));
```

### 1.2 Wire payment receipt email

**File:** `plugins/paymob/src/` — find the webhook handler or payment success callback

After a successful Paymob payment:
```typescript
import { EmailService, paymentReceiptTemplate } from '...';

EmailService.send({
  to: guestEmail,
  subject: 'Payment Received — SinaiCamps',
  html: paymentReceiptTemplate({
    guestName,
    amount: `${amount} ${currency}`,
    paymentId: transactionId,
    date: new Date().toLocaleDateString('en-US'),
  }),
}).catch(err => api.logger.error('Payment receipt email failed', err));
```

### 1.3 Wire booking cancellation email

**File:** wherever cancellation API route exists (search `cancel` in `plugins/booking/src/`)

If no cancellation route exists, create one:
- `POST /api/p/booking/[bookingId]/cancel`
- Auth: guest can cancel their own booking if check-in is > 48h away; manager can always cancel
- Update booking status to `CANCELLED` in DB
- Send cancellation email to guest
- Fire `reservation:after_cancel` hook

### 1.4 Add review request email (post-checkout)

**File:** `plugins/booking/src/api/routes.ts` — find where `reservation:after_checkout` fires

After checkout, schedule a review request. Since there's no job queue yet, send it immediately:
```typescript
EmailService.send({
  to: guestEmail,
  subject: `How was your stay at ${propertyName}?`,
  html: reviewRequestTemplate({
    guestName,
    propertyName,
    reviewLink: `${process.env.NEXT_PUBLIC_BASE_URL}/en/guest/reservations/${bookingId}/review`,
  }),
}).catch(err => api.logger.error('Review request email failed', err));
```

### 1.5 Owner notification: new booking

Add a new email template to `src/lib/email.ts`:
```typescript
export function newBookingNotificationTemplate(data: {
  ownerName: string;
  guestName: string;
  propertyName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  amount: string;
  manageUrl: string;
}): string { ... }
```

Wire it: after booking creation, fetch property owner email and send notification.

**Test for 1.1–1.5:**
```bash
# Add unit test in plugins/booking/src/__tests__/email-notifications.test.ts
# Mock EmailService.send, create a booking via the API, assert send was called with correct args
```

**Commit:**
```bash
git commit -m "feat(notifications): wire email confirmations for booking, payment, cancellation, checkout"
```

---

## Sprint 2 — File Upload System (P1)

No upload endpoint exists. Property owners cannot upload real photos/logos without a CDN URL. Implement a simple upload system using local disk storage (with an S3 adapter interface for future cloud migration).

### 2.1 Create upload API route

**File:** `src/app/api/upload/route.ts`

```typescript
// POST /api/upload
// Auth: requireSession (any authenticated user)
// Content-Type: multipart/form-data
// Body: file (image), context: 'property-photo' | 'logo' | 'hero' | 'avatar' | 'gallery'
// Returns: { url: string, fileId: string }
```

Implementation:
1. Parse multipart form with `formidable` or the native Web `Request.formData()`
2. Validate: only images (`image/jpeg`, `image/png`, `image/webp`), max 5MB
3. Generate a unique filename: `crypto.randomUUID() + ext`
4. Save to `public/uploads/[context]/[filename]`
5. Return `{ url: '/uploads/[context]/[filename]' }`

```typescript
export async function POST(req: Request) {
  const session = await requireSession(req);
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const context = formData.get('context') as string;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', context);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${context}/${filename}` });
}
```

### 2.2 Update forms that currently use URL text inputs

Replace URL-input fields with a real file picker in:
- `src/app/[locale]/list-your-camp/property/page.tsx` — photo URLs → file upload
- `src/app/[locale]/list-your-camp/branding/page.tsx` — logo URL, hero URL → file upload
- `src/app/[locale]/owner/property/page.tsx` — logo URL → file upload

**File upload component:** `src/components/FileUpload.tsx`
```typescript
// Props: context, onUpload(url: string), accept, maxSize, label
// Shows: drag-and-drop zone, preview after upload, progress indicator
// Calls: POST /api/upload with the file
```

### 2.3 Add to `.env.example`

```bash
# File Upload
UPLOAD_MAX_SIZE_MB=5
# For S3 (optional, falls back to local disk):
# S3_BUCKET=
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
```

### 2.4 Add to Nginx config

```nginx
# Allow large file uploads
client_max_body_size 10M;
```

**Commit:**
```bash
git commit -m "feat(upload): file upload API + FileUpload component, wire into registration and owner forms"
```

---

## Sprint 3 — Reviews & Ratings (P1)

### 3.1 Database schema

Add migration `src/migrations/014_add_reviews.sql`:
```sql
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  booking_id TEXT NOT NULL UNIQUE,      -- one review per booking
  property_id TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
CREATE INDEX idx_reviews_property ON reviews(property_id, status);
CREATE INDEX idx_reviews_guest ON reviews(guest_id);
```

### 3.2 Review API routes

**File:** `src/app/api/guest/reviews/route.ts`
- `POST /api/guest/reviews` — create review (auth: guest, must own the booking, booking must be CHECKED_OUT)
- `GET /api/guest/reviews` — list reviews by current guest

**File:** `src/app/api/public/reviews/[propertyId]/route.ts`
- `GET /api/public/reviews/[propertyId]` — public endpoint, returns approved reviews with average rating

**File:** `src/app/api/manage/[listingId]/reviews/route.ts`
- `GET` — list all reviews for listing (pending + approved)
- `PATCH` — approve/reject a review (manager/owner only)

### 3.3 Review form page

**File:** `src/app/[locale]/guest/reservations/[id]/review/page.tsx`

Show only if:
- Booking status is `CHECKED_OUT`
- No review already submitted for this booking

Form fields: 1–5 star rating (clickable stars), review title (optional), review body (required, min 20 chars). On submit: `POST /api/guest/reviews`. On success: "Thanks for your review! It will be published after moderation."

### 3.4 Reviews display on listing detail

**File:** `src/app/[locale]/stay/[slug]/page.tsx`

Add a reviews section below amenities:
```typescript
const reviews = await fetch(`/api/public/reviews/${propertyId}`).then(r => r.json());
// Render: average star rating badge, total count, list of approved reviews (name, date, body, stars)
```

### 3.5 Manager reviews panel

**File:** `src/app/[locale]/manage/[listingId]/reviews/page.tsx` (create new page)

Table of all reviews. Approve/reject buttons. Add nav item to manage sidebar.

**Commit:**
```bash
git commit -m "feat(reviews): review creation, public display, manager moderation, post-checkout review link"
```

---

## Sprint 4 — Search Service (P2)

### 4.1 Verify current search

```bash
cat src/app/\[locale\]/search/page.tsx | head -40
cat src/app/api/search/route.ts 2>/dev/null || find src/app/api -name "route.ts" | xargs grep -l "search" | head -5
```

If no real search endpoint exists, create `src/app/api/public/search/route.ts`:

```typescript
// GET /api/public/search?q=&checkIn=&checkOut=&guests=&category=&minPrice=&maxPrice=&page=
// Returns: { listings: [...], total, page, pageSize }
```

Query the `properties` + `rooms` tables with:
- Full-text search on `name`, `description`, `city`, `country` via `LIKE '%q%'`
- Date availability check: exclude properties where bookings overlap the requested dates
- Guest count: rooms with capacity >= guests
- Category filter
- Price range filter (min/max nightly rate from rooms table)
- Pagination: 12 per page

### 4.2 Wire search page to real API

**File:** `src/app/[locale]/search/page.tsx`

Ensure the page:
1. Reads `searchParams` (q, checkIn, checkOut, guests, category, minPrice, maxPrice, page)
2. Calls `/api/public/search` with those params
3. Shows filter sidebar that updates URL params without full page reload
4. Shows "X properties found" count
5. Shows pagination controls

**Commit:**
```bash
git commit -m "feat(search): implement full search API with availability, filters, pagination"
```

---

## Sprint 5 — iCal Public Feed (P2)

### 5.1 Verify existing iCal plugin

```bash
cat plugins/ical/src/index.ts
find plugins/ical/src -name "*.ts" | xargs wc -l
```

### 5.2 Create public iCal endpoint (if not exists)

**File:** `src/app/api/public/ical/[propertyId]/route.ts`

```typescript
// GET /api/public/ical/[propertyId].ics
// No auth required — this is a public calendar feed
// Returns: text/calendar (RFC 5545 format)
```

Generate from bookings:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SinaiCamps//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:[bookingId]@sinaicamps.com
SUMMARY:Booked — [roomName]
DTSTART;VALUE=DATE:[checkInYYYYMMDD]
DTEND;VALUE=DATE:[checkOutYYYYMMDD]
STATUS:CONFIRMED
END:VEVENT
...
END:VCALENDAR
```

### 5.3 Show iCal subscription link in manager settings

**File:** `src/app/[locale]/manage/[listingId]/settings/page.tsx`

In the "Integrations" or "Calendar" tab, add:
```
Your iCal feed URL:
https://sinaicamps.com/api/public/ical/[propertyId].ics
[Copy to clipboard button]
```

**Commit:**
```bash
git commit -m "feat(ical): public iCal feed endpoint + subscription link in manager settings"
```

---

## Sprint 6 — Dashboard Widgets (P2)

The `dashboard.*` PluginShell slots (`dashboard.top`, `dashboard.middle`, `dashboard.widgets`, `dashboard.bottom`) render nothing because no plugin registers UI for them.

### 6.1 Owner dashboard stats widget

The owner dashboard (`src/app/[locale]/owner/dashboard/page.tsx`) already fetches stats. Verify it renders them. If the `PluginShell name="dashboard.top"` renders nothing, create a default stats card component directly in the page (not via PluginShell) showing:
- Upcoming bookings (next 7 days)
- This month's revenue
- Current occupancy rate

```bash
# Check what the page renders for stats
grep -n "upcomingBookings\|totalRevenue\|occupancy\|stats" src/app/\[locale\]/owner/dashboard/page.tsx
```

If stats are fetched but not displayed because they rely on an empty PluginShell slot — move them to direct JSX.

### 6.2 Manager dashboard stats

**File:** `src/app/[locale]/manage/[listingId]/page.tsx`

This page fetches `/api/p/crm/stats`. If CRM plugin is not enabled, it fails. Add a fallback that queries core booking tables directly:

```typescript
// Fetch directly from bookings table when CRM plugin unavailable:
const stats = await fetch(`/api/manage/${listingId}/stats`).then(r => r.json()).catch(() => null);
```

Create `src/app/api/manage/[listingId]/stats/route.ts`:
```typescript
// GET — returns { todayArrivals, todayDepartures, occupancyRate, monthRevenue, pendingTasks }
// Queries booking tables + plugin_housekeeping_tasks + plugin_maintenance_requests
```

**Commit:**
```bash
git commit -m "feat(dashboard): owner + manager stats direct from DB, no plugin dependency"
```

---

## Sprint 7 — Housekeeping CRUD (P3)

The housekeeping plugin has DB schema and routes directory. Read the existing routes:

```bash
ls plugins/housekeeping/src/routes/
cat plugins/housekeeping/src/routes/housekeeping.ts 2>/dev/null || cat plugins/housekeeping/src/routes/*.ts
```

Ensure these endpoints exist and work:
- `GET /api/p/housekeeping/tasks?listingId=&status=&date=` — list tasks with filters
- `POST /api/p/housekeeping/tasks` — create task (manager/staff only)
- `PATCH /api/p/housekeeping/tasks/[id]` — update status/assignee (staff can update own tasks)
- `DELETE /api/p/housekeeping/tasks/[id]` — delete task (manager only)

Ensure the UI page at `src/app/[locale]/manage/[listingId]/housekeeping/page.tsx` renders:
- Task list with status filters (pending / in-progress / done)
- "Add Task" button → modal with room selector, category, priority, notes, assign-to
- Each task row: room name, category badge, priority badge, assignee, status dropdown
- Auto-created cleaning tasks show up here after checkout (from the hook)

**Commit:**
```bash
git commit -m "feat(housekeeping): complete CRUD API + task management UI"
```

---

## Sprint 8 — Maintenance CRUD (P3)

Same pattern as housekeeping. Read:
```bash
ls plugins/maintenance/src/routes/
cat plugins/maintenance/src/routes/*.ts
```

Ensure endpoints:
- `GET /api/p/maintenance/requests?listingId=&status=` — list requests
- `POST /api/p/maintenance/requests` — create request (any staff/manager)
- `PATCH /api/p/maintenance/requests/[id]` — update status, assign technician, add notes
- `DELETE /api/p/maintenance/requests/[id]` — delete (manager only)

UI at `src/app/[locale]/manage/[listingId]/maintenance/page.tsx`:
- Requests list: title, location, priority badge, status, assigned-to, created date
- "Report Issue" button → form: title, description, location, priority, photo upload (use FileUpload component from Sprint 2)
- Status board view (Kanban): Reported → In Progress → Resolved

**Commit:**
```bash
git commit -m "feat(maintenance): complete CRUD API + request management UI with photo upload"
```

---

## Sprint 9 — Booking Cancellation (P3)

### 9.1 Guest-initiated cancellation

**File:** `src/app/api/guest/reservations/[id]/cancel/route.ts`

```typescript
// POST /api/guest/reservations/[id]/cancel
// Auth: guest, must own the reservation
// Rule: check-in must be > 48 hours away
// Updates booking status to CANCELLED
// Fires reservation:after_cancel hook
// Sends cancellation email to guest
// Sends notification to owner/manager
```

### 9.2 Manager-initiated cancellation

Already may exist in `src/app/api/manage/[listingId]/bookings/[id]/route.ts`. If it does, verify it:
- Updates status to CANCELLED
- Sends cancellation email to guest (with reason)
- Fires hook

### 9.3 UI: Cancel button on reservation detail

**File:** `src/app/[locale]/guest/reservations/[id]/page.tsx`

Show "Cancel Reservation" button only when:
- Status is `PENDING` or `CONFIRMED`
- `checkIn > now + 48h`

On click: confirmation dialog → "Are you sure? This cannot be undone." → POST cancel → show success message → update status in UI.

**Commit:**
```bash
git commit -m "feat(booking): guest + manager cancellation flow with email notifications"
```

---

## Sprint 10 — Navigation & Sidebar Slots (P4)

The `nav.main` and `manager.sidebar.*` PluginShell slots are empty.

### 10.1 Manager sidebar dynamic items

**File:** `src/app/[locale]/manage/[listingId]/layout.tsx`

Replace the static sidebar nav items that depend on PluginShell slots with direct conditional rendering based on enabled plugins. Fetch the enabled plugins for this listing at layout load time:

```typescript
const enabledPlugins = await fetch(`/api/manage/${listingId}/plugins/enabled`).then(r => r.json());
```

Then render sidebar items conditionally:
```typescript
{enabledPlugins.includes('housekeeping') && <NavItem href={`/manage/${listingId}/housekeeping`} label="Housekeeping" />}
{enabledPlugins.includes('maintenance') && <NavItem href={`/manage/${listingId}/maintenance`} label="Maintenance" />}
{enabledPlugins.includes('pos-kds') && <NavItem href={`/manage/${listingId}/orders`} label="Orders" />}
```

If `GET /api/manage/[listingId]/plugins/enabled` doesn't exist, create it — returns array of enabled plugin IDs for the listing.

### 10.2 Loyalty dashboard widget

**File:** `src/app/[locale]/guest/page.tsx`

The guest dashboard has a `PluginShell` slot for loyalty. Instead of relying on the slot, directly fetch and render loyalty points when the loyalty plugin is enabled:

```typescript
const loyalty = await fetch(`/api/p/loyalty/balance/${guestId}`).then(r => r.json()).catch(() => null);
// Render: "Your Loyalty Points: 1,250 pts | Gold Tier" card
```

**Commit:**
```bash
git commit -m "feat(nav): dynamic manager sidebar per enabled plugins, loyalty widget on guest dashboard"
```

---

## Final Verification

After all 10 sprints:

```bash
# Unit tests
npm test
# Must be ≥ 1177

# Full E2E suite
npx playwright test --reporter=list 2>&1 | tail -5
# Must be 376/376

# TypeScript
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Must be 0

# No new console.log in src/ or plugins/
grep -rn "console\.log\|console\.error" src/ plugins/ --include="*.ts" --include="*.tsx" | \
  grep -v "\.test\.\|\.spec\.\|email\.ts\|// " | wc -l
# Should be 0 (or same as before this sprint)
```

---

## Commit Strategy

One commit per sprint as specified above. After all sprints:

```bash
git add IMPLEMENTATION_GAP_REPORT.md AGENT_LOGBOOK.md
git commit -m "docs: update gap report and logbook with sprint 1-10 implementation status"
```

---

## AGENT_LOGBOOK.md Entry

```markdown
## [DATE] — Full Feature Implementation Sprint

### Sprints Completed
- Sprint 1: Email notifications wired (booking confirm, payment receipt, cancellation, review request, owner alert)
- Sprint 2: File upload API + FileUpload component + wired into forms
- Sprint 3: Reviews & ratings (schema, API, review form, display, manager moderation)
- Sprint 4: Search API with availability filtering, category, price range, pagination
- Sprint 5: iCal public feed + subscription link in settings
- Sprint 6: Dashboard stats direct from DB (no plugin dependency)
- Sprint 7: Housekeeping CRUD complete
- Sprint 8: Maintenance CRUD with photo upload
- Sprint 9: Booking cancellation (guest + manager) with email
- Sprint 10: Dynamic sidebar per enabled plugins, loyalty widget

### New Gotchas
- EmailService.send() must always be fire-and-forget (.catch()) — never await it in a user request path
- File uploads save to public/uploads/ — this directory is gitignored, must be created on server
- iCal DTEND for all-day events uses exclusive end date (checkout day, not night before)
- Search availability query: use NOT EXISTS subquery, not LEFT JOIN, for SQLite performance
```
