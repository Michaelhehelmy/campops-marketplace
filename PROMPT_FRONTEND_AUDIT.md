# OpenCode Agent Prompt: Full Frontend Page Audit

## Mission

Read every frontend page file in the app. For each page, analyze every UI element that exists and compare it against what it **should** have, what is **missing**, and what **should not** be there. Produce a structured findings report and fix every HIGH-priority gap.

**Read before starting:**
- `AGENT_LOGBOOK.md` — codebase gotchas
- `src/components/` — all available components
- `src/app/[locale]/layout.tsx` — root layout
- `src/middleware.ts` — auth guards and redirects

**Test baseline to maintain throughout:**
```bash
npm test && npx playwright test --reporter=list 2>&1 | tail -3
```

---

## Page Map

The app has 4 surface areas. Audit ALL of them.

```
MARKETPLACE (public)
├── /[locale]                                    → src/app/[locale]/page.tsx
├── /[locale]/search                             → src/app/[locale]/search/page.tsx
├── /[locale]/stay/[slug]                        → src/app/[locale]/stay/[slug]/page.tsx
├── /[locale]/book/[propertyId]                  → src/app/[locale]/book/[propertyId]/page.tsx
├── /[locale]/book/summary                       → src/app/[locale]/book/summary/page.tsx
├── /[locale]/login                              → src/app/[locale]/login/page.tsx
├── /[locale]/loyalty                            → src/app/[locale]/loyalty/page.tsx
├── /[locale]/unauthorized                       → src/app/[locale]/unauthorized/page.tsx
└── /[locale]/list-your-camp/*                   → src/app/[locale]/list-your-camp/*/page.tsx
    ├── (index)   → step 1: account details
    ├── branding  → step 2: slug + colors + logo
    ├── property  → step 3: property info
    ├── plan      → step 4: plan selection + payment
    └── success   → confirmation

GUEST DASHBOARD
├── /[locale]/guest                              → guest/page.tsx
├── /[locale]/guest/reservations                 → guest/reservations/page.tsx
├── /[locale]/guest/reservations/[id]            → guest/reservations/[id]/page.tsx
├── /[locale]/guest/orders                       → guest/orders/page.tsx
├── /[locale]/guest/following                    → guest/following/page.tsx
├── /[locale]/guest/profile                      → guest/profile/page.tsx
└── /[locale]/guest/settings                     → guest/settings/page.tsx

TENANT WEBSITE (rendered via catch-all)
├── /[locale]/[tenantSlug]                       → [tenantSlug]/[[...slug]]/page.tsx → TenantHomePage
├── /[locale]/[tenantSlug]/about                 → TenantAboutPage
├── /[locale]/[tenantSlug]/rooms                 → TenantRoomsPage
├── /[locale]/[tenantSlug]/gallery               → TenantGalleryPage
├── /[locale]/[tenantSlug]/services              → TenantServicesPage
└── /[locale]/[tenantSlug]/contact               → TenantContactPage
    Components: src/components/tenant/Tenant*.tsx

MANAGER DASHBOARD
├── /[locale]/manage/[listingId]                 → manage dashboard
├── /[locale]/manage/[listingId]/bookings        → bookings list
├── /[locale]/manage/[listingId]/rooms           → rooms CRUD
├── /[locale]/manage/[listingId]/staff           → staff management
├── /[locale]/manage/[listingId]/guests          → CRM / guests
├── /[locale]/manage/[listingId]/finance         → finance / commissions
├── /[locale]/manage/[listingId]/housekeeping    → housekeeping tasks
├── /[locale]/manage/[listingId]/maintenance     → maintenance requests
├── /[locale]/manage/[listingId]/operations      → operations overview
├── /[locale]/manage/[listingId]/orders          → POS orders
├── /[locale]/manage/[listingId]/plugins         → plugin management
├── /[locale]/manage/[listingId]/posts/*         → content/blog posts
├── /[locale]/manage/[listingId]/marketplace     → marketplace visibility
└── /[locale]/manage/[listingId]/settings        → listing settings

OWNER PORTAL
├── /[locale]/owner/dashboard                    → owner dashboard
├── /[locale]/owner/property                     → branding + domain settings
├── /[locale]/owner/bookings                     → booking overview
└── /[locale]/owner/revenue                      → revenue / commissions

MASTER/ADMIN
├── /[locale]/admin                              → admin dashboard
├── /[locale]/admin/listings                     → all listings
├── /[locale]/admin/listings/[id]                → listing detail + impersonate
├── /[locale]/admin/plugins                      → global plugin catalog
├── /[locale]/admin/settings                     → platform settings
├── /[locale]/admin/setup                        → initial setup wizard
├── /[locale]/admin/accounts                     → user accounts
├── /[locale]/admin/health                       → system health
├── /[locale]/admin/reports/commissions          → platform commissions
└── /[locale]/admin/master/*                     → master-tier admin
    ├── master/page.tsx
    ├── master/admins/page.tsx
    ├── master/commissions/page.tsx
    ├── master/listings/[id]/page.tsx
    ├── master/plugins/page.tsx
    └── master/settings/page.tsx
```

---

## Audit Method

For each page, follow this exact process:

### Step 1 — Read the file
```bash
cat src/app/[locale]/[path]/page.tsx
# For tenant components:
cat src/components/tenant/Tenant*.tsx
```

### Step 2 — Inventory what exists

List every visible UI section found in the JSX:
- Navigation component(s) used
- Page title / heading (h1)
- Data sections (tables, cards, lists)
- Forms and their fields
- CTAs (buttons, links)
- Empty states
- Loading states
- Error handling
- SEO metadata (`generateMetadata` or `<Head>`)
- Auth guard (redirect on missing session)
- Mobile responsiveness signals (responsive classes, `hidden md:block`, etc.)
- Accessibility markers (`aria-label`, `role`, `alt`)

### Step 3 — Compare against the expected spec below

Use the **Expected Elements Matrix** section of this prompt as the reference.

### Step 4 — Produce findings in this format

```
PAGE: /en/[path]
FILE: src/app/[locale]/[path]/page.tsx

FOUND:
  ✅ [element]
  ✅ [element]

MISSING (should have but doesn't):
  ❌ [HIGH] [element] — [why it matters]
  ❌ [MED]  [element] — [why it matters]
  ❌ [LOW]  [element] — [why it matters]

WRONG (has but shouldn't, or incorrectly implemented):
  ⚠️  [HIGH] [element] — [what's wrong]
  ⚠️  [MED]  [element] — [what's wrong]
```

### Step 5 — Fix all HIGH-priority findings immediately

After producing findings for all pages, fix every `[HIGH]` item. Commit after each surface area:
```bash
git add src/app/[locale]/[surface]/
git commit -m "fix(frontend): [surface] — [summary of fixes]"
```

---

## Expected Elements Matrix

### Marketplace Homepage (`/[locale]`)

**Must have:**
- `<Nav>` component (marketplace nav with logo, search icon, login/signup CTA, language switcher)
- `<HeroSection>` with: destination text input, check-in/check-out date pickers, guests selector, Search button
- `<FeaturedListings>` grid: property cards with photo, name, location, price per night, rating
- `<Categories>` filter section: category icons, names, click-to-filter
- Page footer with: copyright, links (About, Contact, Privacy, Terms), social icons
- `generateMetadata` exporting title + description + OG image
- `<Suspense>` around data-fetching sections
- `lang` attribute on `<html>` (set in layout — verify)

**Must NOT have:**
- ShopfrontNav (tenant branding) on marketplace domain
- Any hardcoded property-specific content
- `console.log` / `console.error` (should use logger)

---

### Search Results (`/[locale]/search`)

**Must have:**
- Search refinement bar (destination, dates, guests — pre-filled from query params)
- Results count text ("X properties found")
- Filter sidebar or top filter bar: price range, category, amenities checkboxes
- Property card grid: photo, name, location, price, rating, "View" CTA
- Empty state when no results: illustration + "No properties match" message + "Clear filters" link
- Pagination or infinite scroll
- Loading skeleton while results load
- SEO: `generateMetadata` with dynamic title ("Search results for X")
- Breadcrumb: Home → Search

**Must NOT have:**
- Admin or manager-specific components
- Unauthenticated user sees booking CTA that leads nowhere

---

### Listing Detail (`/[locale]/stay/[slug]`)

**Must have:**
- Property hero photo (full-width)
- Photo gallery (3–5 images with expand/lightbox)
- Property name (h1), location (city, country), star rating
- Short description (excerpt) + "Read more" toggle for long descriptions
- Amenities/features grid: icons + labels
- Room types section: for each room — name, photo, capacity, features, price/night, "Book Now" CTA
- Booking widget: date picker (check-in/out), guests selector, price summary, Book Now button
- Reviews section (or placeholder "Be the first to review")
- Location/map section (or address text)
- Contact property link or WhatsApp button
- Breadcrumb: Home → Listing → Property Name
- SEO: `generateMetadata` with property name, description, OG image from property photo
- Structured data (`application/ld+json` for Hotel/LodgingBusiness schema)
- Share buttons (WhatsApp, copy link)
- `<Suspense>` boundary around booking widget

**Must NOT have:**
- Booking widget for basic plan properties (redirect to marketplace listing instead)
- Raw `[object Object]` in any rendered text
- Broken image placeholders

---

### Booking Flow

#### `/[locale]/book/[propertyId]` (select room / dates)

**Must have:**
- Property name and summary at top
- Date picker (check-in, check-out) with availability highlight
- Room selector (radio or card selection per room type)
- Guests selector
- Price breakdown (per night × nights = subtotal, taxes, total)
- "Continue" / "Next" CTA → goes to summary
- Back link to listing
- Auth prompt if not logged in ("Please sign in to book")

#### `/[locale]/book/summary` (checkout)

**Must have:**
- Booking summary card: property name, dates, room, guests, price breakdown
- Guest details form: full name (required), email (required), phone (optional), special requests (textarea)
- Payment method section: Pay Now (Paymob card) / Pay Later radio buttons
- Terms acceptance checkbox
- "Confirm Booking" primary CTA with loading state
- `data-testid="continue-to-payment"` on proceed button
- `id="pay_later"` on pay-later option
- `data-testid="login-button"` equivalents for accessibility
- Success state: "Booking Confirmed!" message, booking reference number, "View My Reservations" link
- Error state: inline error message when booking fails (not just console)

---

### Registration Wizard (`/[locale]/list-your-camp/*`)

**Step 1 (index) — Account details:**
- Progress indicator showing 4 steps
- Email field (required)
- Password field + confirmation (required, min 8 chars)
- Full name field
- Phone field (optional)
- "Already have an account? Log in" link
- Submit button with loading state
- Inline validation errors

**Step 2 (branding) — Identity:**
- Progress indicator
- Property slug input with live availability check (✅ available / ❌ taken)
- Property name field
- Primary color picker
- Logo upload (image upload component)
- "Back" link and "Continue" CTA
- sessionStorage guard (redirect to step 1 if reg_step1 missing)

**Step 3 (property) — Details:**
- Property description textarea
- City + Country selectors
- Category selector
- Upload up to 5 photos
- Amenities checklist
- sessionStorage guard (redirect to step 1)

**Step 4 (plan) — Selection:**
- 3-column plan cards: Basic, Premium, Ultimate
- Feature comparison per plan
- Pricing per month
- "Select" CTA per plan
- Payment form for non-Basic plans (or Stripe element)
- sessionStorage guard (both reg_step1 AND reg_step2)
- After successful registration: `authClient.signIn.email()` auto-login

**Success page:**
- Checkmark / celebration illustration
- "Your camp is live!" heading
- Subdomain link (clickable: `[slug].sinaicamps.com`)
- "Go to Dashboard" CTA → `/en/manage/[slug]`
- "View Your Public Page" CTA → `/en/stay/[slug]`
- sessionStorage cleanup (all reg_* keys removed)

---

### Guest Dashboard (`/[locale]/guest`)

**Must have:**
- Greeting: "Welcome back, [First Name]"
- Stats row: total stays, upcoming reservations count, loyalty points balance
- Upcoming reservations card: next 1–3 bookings with property name, dates, status badge, "View" link
- Recent activity feed (CRM events: BOOKING_CREATED, CHECKED_IN, etc.)
- Quick navigation links: Reservations, Orders, Following, Profile
- Sidebar or top nav with all guest routes

**Reservations list:**
- Table or card list of all reservations
- Columns: Property, Check-in, Check-out, Status, Amount, Actions
- Status badges: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
- "View Details" link per row
- Empty state: "No reservations yet" + "Browse properties" CTA

**Reservation detail (`/[id]`):**
- Booking summary card (all booking fields)
- Payment status and method
- Check-in instructions (if property has set them)
- Cancel button (if status is PENDING or CONFIRMED and check-in > 48h away)
- Download invoice / receipt link (or "PDF" button)

---

### Tenant Website (`/[locale]/[tenantSlug]/*`)

**All tenant pages must have:**
- `<ShopfrontNav>` with: property logo, property name, nav links (Home, Rooms, Gallery, About, Contact), "Book Now" button in brand primary color
- Branding: CSS variables `--tenant-primary`, `--tenant-secondary` applied
- `<ShopfrontFooter>` with: property name, social links, copyright
- SEO: `generateMetadata` with property name, description, OG image

**Home (`TenantHomePage`):**
- Full-width hero image with property name overlay + tagline
- "Book Now" primary CTA → `/[locale]/book/[propertyId]`
- About snippet (2–3 sentences) + "Read More" → /about
- Featured rooms preview (2–3 rooms) with photos and "Book" links
- Services/amenities icons row
- Guest reviews/testimonials section (or placeholder)
- WhatsApp contact button (floating or in section)

**Rooms (`TenantRoomsPage`):**
- Page heading "Our Rooms"
- For each room type: photo, name, description, capacity (icon + number), price per night, amenities list, "Book this room" CTA → `/[locale]/book/[propertyId]`
- Empty state if no rooms configured: "Coming soon" or "Contact us to inquire"

**Gallery (`TenantGalleryPage`):**
- Masonry or grid photo layout
- Lightbox on click (or link to full-size)
- "No photos yet" state if gallery is empty

**About (`TenantAboutPage`):**
- Property story / history section
- Team section (optional)
- Location info with address and embedded map (or Google Maps link)
- Why choose us section

**Services (`TenantServicesPage`):**
- Services grid: icon, name, description per service
- Pricing if applicable

**Contact (`TenantContactPage`):**
- Contact form: name, email, message, "Send" button
- Property address (from DB data)
- Phone number / WhatsApp link
- Email address
- Google Maps embed or "View on Maps" link
- Operating hours

**Tenant pages must NOT have:**
- MarketplaceNav (only ShopfrontNav)
- Plan upgrade prompts visible to public visitors
- Raw property DB fields rendered (no `null`, `undefined`, `[object Object]`)

---

### Manager Dashboard (`/[locale]/manage/[listingId]`)

**Dashboard (index):**
- Stats cards: Today's arrivals, Today's departures, Current occupancy %, Monthly revenue
- Upcoming arrivals table (next 7 days): guest name, room, check-in date, status
- Pending tasks count (housekeeping, maintenance)
- Quick action buttons: Add Manual Booking, Check In Guest, Add Room

**Bookings (`/bookings`):**
- Filter bar: date range, status filter, search by guest name
- Bookings table: ID, Guest, Room, Check-in, Check-out, Status badge, Payment status, Actions
- Bulk actions: mark as confirmed, export CSV
- "Add Manual Booking" CTA → modal or separate form
- Pagination

**Rooms (`/rooms`):**
- Rooms list: photo thumbnail, name, capacity, price, status (active/inactive), Edit/Delete buttons
- "Add Room" CTA → modal or inline form
- Room edit form: name, description, capacity, price, photos upload, amenities

**Staff (`/staff`):**
- Staff list: name, email, role badge, status, "Remove" button
- "Invite Staff" CTA → email invite form

**Guests/CRM (`/guests`):**
- Guest list with visit history
- Search by name or email
- Guest detail panel: total stays, total spend, loyalty tier, recent bookings

**Finance (`/finance`):**
- Revenue chart (monthly)
- Commission breakdown table
- Payout history

**Settings (`/settings`):**
- Property information (name, description, city, contact)
- Booking settings (check-in time, check-out time, min/max nights)
- Notification preferences

---

### Owner Portal (`/[locale]/owner/*`)

**Dashboard:**
- Plan badge (Basic / Premium / Ultimate) with "Upgrade" CTA for non-Ultimate
- Subdomain link with copy button
- Custom domain section (Ultimate only): current domain, DNS verification status, "Verify DNS" button
- Quick stats: total bookings this month, revenue this month

**Property settings (`/property`):**
- Branding section: primary color picker, secondary color, logo upload, tagline
- Save button with loading/success state
- Domain section: current subdomain read-only, custom domain input (Ultimate only)
- "Verify DNS" button → calls `/api/manage/[id]/domain/verify`
- Plan section: current plan display, "Upgrade Plan" CTA

---

### Admin / Master pages (`/[locale]/admin/*`)

**Admin dashboard:**
- Platform stats: total properties, total bookings today, total revenue MTD
- Recent listings table: property name, owner email, plan, status, "Manage" link
- System health indicator

**Listings detail (`/admin/listings/[id]`):**
- Property info panel
- "Login as Owner" impersonation button → fires `/api/admin/impersonate`
- Plugin toggles per listing
- Danger zone: deactivate listing

---

## Output Format

Create the file `FRONTEND_AUDIT_REPORT.md` in the project root as you work. Structure it as:

```markdown
# Frontend Audit Report — [date]

## Summary
- Total pages audited: X
- HIGH issues: X
- MEDIUM issues: X
- LOW issues: X
- Issues fixed in this session: X

## Surface: Marketplace
### /en (Homepage)
...

## Surface: Guest Dashboard
...

## Surface: Tenant Website
...

## Surface: Manager Dashboard
...

## Surface: Owner Portal
...

## Surface: Admin / Master
...
```

---

## Verification After Fixes

After fixing all HIGH items, run:

```bash
npm test                                          # must stay ≥ 1177
npx playwright test --reporter=list 2>&1 | tail -3   # must stay 376/376
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l      # must be 0
```

---

## Commit Strategy

```bash
git add src/app/[locale]/ src/components/
git commit -m "fix(frontend/marketplace): [summary of HIGH fixes]"

git add src/components/tenant/
git commit -m "fix(frontend/tenant): [summary of HIGH fixes]"

git add src/app/[locale]/manage/ src/app/[locale]/owner/ src/app/[locale]/admin/
git commit -m "fix(frontend/dashboards): [summary of HIGH fixes]"

git add FRONTEND_AUDIT_REPORT.md AGENT_LOGBOOK.md
git commit -m "docs: add frontend audit report + logbook update"
```

---

## AGENT_LOGBOOK.md Entry

Append when complete:

```
## [DATE] — Frontend Page Audit

### Pages audited
[list with ✅ / ⚠️ / ❌ status per page]

### HIGH fixes applied
[list]

### Known intentional omissions (LOW priority, deferred)
[list]

### New gotchas discovered
[list]
```
