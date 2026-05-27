# OpenCode Agent Prompt: Deep Role-Specific Frontend Audit (Phase 2)

## Mission

Phase 1 fixed structural gaps (missing sections, broken links, absent SEO). This phase audits **behavior** — what each role can see, what they can do, and whether the UI correctly enforces those boundaries. Fix every HIGH finding.

**Context:**
- Phase 1 report: `FRONTEND_AUDIT_REPORT.md`
- Codebase gotchas: `AGENT_LOGBOOK.md`
- Test baseline: 1177 unit + 376 E2E — must not regress

---

## The 6 Roles

| Role | Entry Point | Key Constraint |
|------|-------------|---------------|
| **Public / Unauthenticated** | `/en`, `/en/stay/[slug]`, `/en/search` | Cannot book, cannot access any dashboard |
| **Guest** | `/en/guest/*` | Can browse, book, view own reservations only |
| **Staff** | `/en/manage/[listingId]/*` | Subset of manager permissions (no finance, no settings, no plugins) |
| **Manager** | `/en/manage/[listingId]/*` | Full manage access for their listing only |
| **Owner** | `/en/owner/*` | Property branding, plan upgrades, cross-listing overview |
| **Master/Admin** | `/en/admin/*` | Full platform access + impersonation |

---

## Audit Domain 1 — Role-Gated Visibility in UI

### 1.1 Manager Dashboard — Staff vs Manager rendering

**File:** `src/app/[locale]/manage/[listingId]/layout.tsx`

Read the sidebar nav. Check every navigation item and verify that **Staff role** cannot see:
- `/finance` — revenue data (staff should not see this)
- `/plugins` — plugin management (manager/owner only)
- `/settings` — listing configuration (manager/owner only)

**Check pattern:**
```bash
grep -rn "staff\|role\|session" src/app/\[locale\]/manage/ --include="*.tsx" --include="*.ts" | grep -i "role\|staff\|permission"
```

If the sidebar renders the same items regardless of role, that is a **HIGH** issue. Fix: fetch session role and conditionally render nav items.

**Expected staff nav:** Dashboard, Bookings, Housekeeping, Maintenance, Operations, Orders  
**Hidden from staff:** Finance, Plugins, Settings, Staff management

**Fix pattern:**
```typescript
const { data: session } = authClient.useSession();
const isStaff = session?.user?.role === 'staff';
// Then conditionally render:
{!isStaff && <NavItem href={`/manage/${listingId}/finance`} label="Finance" />}
{!isStaff && <NavItem href={`/manage/${listingId}/plugins`} label="Plugins" />}
{!isStaff && <NavItem href={`/manage/${listingId}/settings`} label="Settings" />}
```

### 1.2 Owner Dashboard — Plan-Gated Features

**File:** `src/app/[locale]/owner/property/page.tsx`

Verify these features are conditionally shown based on plan:

| Feature | Basic | Premium | Ultimate |
|---------|-------|---------|----------|
| Custom subdomain | ❌ hidden | ✅ shown | ✅ shown |
| Custom domain input | ❌ hidden | ❌ hidden | ✅ shown |
| DNS verify button | ❌ hidden | ❌ hidden | ✅ shown |
| Branding (colors, logo) | ❌ hidden | ✅ shown | ✅ shown |
| Advanced SEO settings | ❌ hidden | ❌ hidden | ✅ shown |

If the custom domain section renders for all plans, that is **HIGH** — a Basic plan user could attempt to set a custom domain.

Check:
```bash
grep -n "ultimate\|premium\|basic\|plan" src/app/\[locale\]/owner/property/page.tsx
```

**File:** `src/app/[locale]/owner/dashboard/page.tsx`

Check for an "Upgrade Plan" CTA. Basic plan owners must see a prominent upgrade prompt. Premium owners must see an upgrade to Ultimate prompt. Ultimate owners must see "Current plan: Ultimate ✓" with no upgrade CTA.

### 1.3 Guest — Own Data Only

**Files:** `src/app/[locale]/guest/reservations/page.tsx`, `src/app/[locale]/guest/reservations/[id]/page.tsx`

Check that the reservations list fetches from `/api/guest/reservations` (which filters by session user ID server-side). Verify the page does NOT pass a `userId` query param — that would be an IDOR risk.

```bash
grep -n "userId\|user_id\|?user=" src/app/\[locale\]/guest/reservations/ -r
```

If any `userId` is passed as a URL parameter to filter data, that is a **CRITICAL** security issue.

### 1.4 Admin — Impersonation Guard

**File:** `src/app/[locale]/admin/listings/[id]/page.tsx`

Verify the "Login as Owner" / impersonation button:
- Only renders when the current user is `master` role
- On click, calls `/api/admin/impersonate` with the listingId
- After impersonation succeeds, redirects to `/en/owner/dashboard` 
- There is a visible "Exit Impersonation" mechanism (banner or nav item) once impersonating

If impersonation has no exit mechanism, that is **HIGH**.

---

## Audit Domain 2 — Plugin-Gated UI

### 2.1 Booking Plugin Gating

The booking plugin may be disabled per-listing. When it is disabled:
- **Tenant website** (`TenantHomePage`, `TenantRoomsPage`): "Book Now" button must NOT appear, or must show "Contact us to inquire" instead
- **Manager dashboard**: `/manage/[listingId]/bookings` must show a "Booking plugin not enabled" message rather than an empty table
- **Guest**: booking flow at `/en/book/[propertyId]` must redirect or show "Bookings not available for this property"

Check how TenantHomePage handles the disabled state:
```bash
grep -n "booking\|plugin\|disabled\|enabled" src/components/tenant/TenantHomePage.tsx
```

If the "Book Now" button renders regardless of plugin state, that is **HIGH**.

### 2.2 Loyalty Plugin Gating

**File:** `src/app/[locale]/loyalty/page.tsx`

The loyalty page must only render usable content if the loyalty plugin is enabled for the tenant. If it's disabled, the page should show a friendly "Loyalty program coming soon" message — not a blank page or an error.

### 2.3 Manager Sidebar — Plugin-Driven Items

**File:** `src/app/[locale]/manage/[listingId]/layout.tsx`

The sidebar includes items like Housekeeping, Maintenance, and Operations that are driven by plugins. Check:
- Are these items always visible, or are they conditionally shown based on active plugins?
- If housekeeping plugin is disabled, does the `/housekeeping` nav item disappear?

```bash
grep -n "PluginShell\|plugin\|enabled" src/app/\[locale\]/manage/\[listingId\]/layout.tsx 2>/dev/null || \
grep -n "PluginShell\|plugin\|enabled" src/app/\[locale\]/manage/\[listingId\]/housekeeping/page.tsx
```

---

## Audit Domain 3 — Form State Completeness

For every form across the app, verify all 4 states exist:

| State | Requirement |
|-------|------------|
| **Idle** | Form is ready, submit button enabled |
| **Loading** | Submit button disabled + spinner, form fields disabled |
| **Success** | Success message or redirect, form cleared |
| **Error** | Inline error per field (validation) + top-level API error message |

### 3.1 Critical forms to check

**Login form (`/en/login/page.tsx`):**
```bash
grep -n "loading\|error\|isSubmitting\|disabled" src/app/\[locale\]/login/page.tsx
```
Must have: loading spinner on submit, inline error "Invalid email or password", no double-submit.

**Registration — Step 1 (`/en/list-your-camp/page.tsx`):**
- Password strength indicator (min 8 chars, must include number)
- Confirm password must match
- Email format validation inline (not just on submit)

**Registration — Branding step:**
- Slug: debounced live check (300ms delay), show ✅ Available / ❌ Taken
- Color picker must show hex value input alongside the color swatch
- Logo upload must show preview after selection

**Contact form (TenantContactPage):**
- reCAPTCHA or honeypot to prevent spam
- Email field validation
- Success message after submit (not just console.log)
- Error message if API fails

**Manager — Add Manual Booking (if exists):**
- Date range validation (check-out must be after check-in)
- Guest lookup (search by email or name)
- Room availability shown for selected dates

### 3.2 Check all forms for double-submit protection

```bash
grep -rn "onSubmit\|handleSubmit" src/app/\[locale\]/ --include="*.tsx" -l | while read f; do
  if ! grep -q "disabled.*loading\|isSubmitting\|isLoading" "$f"; then
    echo "MISSING submit guard: $f"
  fi
done
```

Every `onSubmit` handler without a disabled submit button during loading is a **MEDIUM** issue.

---

## Audit Domain 4 — Empty States

Every page that displays a list must have an explicit empty state. Verify:

| Page | Empty state text | CTA |
|------|-----------------|-----|
| Guest reservations | "No reservations yet" | "Browse properties" → /en/search |
| Guest orders | "No orders yet" | "Browse properties" → /en/search |
| Guest following | "You haven't followed any properties" | "Discover camps" → /en |
| Manage bookings | "No bookings found" | "Add Manual Booking" button |
| Manage rooms | "No rooms added yet" | "Add Room" button |
| Manage staff | "No staff members yet" | "Invite Staff" button |
| Manage guests | "No guests yet" | (informational only) |
| Admin listings | "No listings yet" | "Create First Listing" button |
| Search results | "No properties match your search" | "Clear filters" link |
| Tenant rooms | "Rooms coming soon — contact us" | WhatsApp / contact link |
| Tenant gallery | "Gallery coming soon" | (no CTA needed) |

Check each:
```bash
for page in \
  "src/app/[locale]/guest/reservations/page.tsx" \
  "src/app/[locale]/guest/orders/page.tsx" \
  "src/app/[locale]/guest/following/page.tsx" \
  "src/components/tenant/TenantRoomsPage.tsx" \
  "src/components/tenant/TenantGalleryPage.tsx"; do
  echo "=== $page ==="; grep -c "empty\|no.*yet\|No.*found\|coming soon" "$page" 2>/dev/null || echo "0 empty states"
done
```

Missing empty state on a data list = **MEDIUM** issue.

---

## Audit Domain 5 — Loading States

Every data fetch must show a skeleton or spinner. Check:

```bash
grep -rn "useEffect\|fetch\|useSWR\|useQuery" src/app/\[locale\]/ --include="*.tsx" -l | while read f; do
  if ! grep -q "isLoading\|loading\|skeleton\|Skeleton\|spinner\|Spinner\|animate-pulse" "$f"; then
    echo "MISSING loading state: $f"
  fi
done
```

Any client component that fetches data without showing a loading skeleton is a **MEDIUM** issue for dashboards, **HIGH** for guest-facing pages (Reservations list, Booking summary).

---

## Audit Domain 6 — Accessibility Audit

### 6.1 Heading hierarchy

Every page must have exactly one `<h1>`. Check for pages with zero or multiple h1s:
```bash
grep -rn "<h1" src/app/\[locale\]/ src/components/ --include="*.tsx" | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20
```

Pages with 0 h1: **MEDIUM**
Pages with 2+ h1: **HIGH** (breaks screen reader navigation)

### 6.2 Interactive elements without labels

```bash
grep -rn "<button\b" src/app/\[locale\]/ src/components/ --include="*.tsx" | grep -v "aria-label\|aria-labelledby\|children\|>.*<" | grep '"/>' | head -20
```

Icon-only buttons (❌ delete, ✏️ edit) with no `aria-label` = **MEDIUM**.

### 6.3 Images without alt text

```bash
grep -rn "<img\b" src/app/\[locale\]/ src/components/ --include="*.tsx" | grep -v 'alt=' | head -20
grep -rn "Image\b" src/app/\[locale\]/ src/components/ --include="*.tsx" | grep -v 'alt=' | head -20
```

Any `<img>` or Next.js `<Image>` without `alt` = **HIGH** (accessibility violation + SEO penalty).

### 6.4 Form inputs without labels

```bash
grep -rn "<input\b" src/app/\[locale\]/ src/components/ --include="*.tsx" | grep -v "aria-label\|id=\|type=\"hidden\|type=\"submit\|type=\"checkbox" | head -20
```

Input without `<label>` or `aria-label` = **MEDIUM**.

### 6.5 Color contrast (manual check)

Read the tenant CSS variables in `TenantHomePage.tsx`. If `--tenant-primary` is applied as text-on-white background or white-on-primary button, the contrast must be ≥ 4.5:1 for normal text, ≥ 3:1 for large text. If the app uses user-defined colors with no contrast enforcement, note as **LOW** with a recommendation to add a contrast warning in the branding picker.

---

## Audit Domain 7 — Internationalization (i18n) Completeness

### 7.1 Find hardcoded English strings in user-facing components

```bash
grep -rn "\"[A-Z][a-z]" src/app/\[locale\]/ src/components/ --include="*.tsx" | \
  grep -v "//\|className\|href\|type=\|role=\|data-\|import\|aria-\|placeholder=.*{t\|variant=" | \
  grep -v "\.ts\"\|\.tsx\"\|from '\|require(" | \
  head -40
```

Hardcoded display strings that are not passed through `useTranslations` or `getTranslations` = **MEDIUM** (breaks Arabic locale).

### 7.2 Verify RTL-sensitive layouts

With `dir="rtl"` now applied (from Phase 1 fix), check that flex/grid layouts use logical CSS properties:

```bash
grep -rn "text-left\|text-right\|ml-\|mr-\|pl-\|pr-\|float-left\|float-right" src/components/ --include="*.tsx" | grep -v "//\|className.*:\|md:\|lg:\|sm:" | head -30
```

Classes like `ml-4` instead of `ms-4` (margin-start) break RTL layout. These are **LOW** for most elements but **HIGH** for navigation and form layouts where alignment is critical.

### 7.3 Language switcher coverage

**File:** `src/components/LanguageSwitcher.tsx`

Verify it appears on:
- Marketplace homepage nav ✅ / ❌
- Listing detail page ✅ / ❌
- Guest dashboard ✅ / ❌
- Booking flow ✅ / ❌
- Registration wizard ✅ / ❌

Missing LanguageSwitcher from any public-facing page = **MEDIUM**.

---

## Audit Domain 8 — Navigation Consistency

### 8.1 Verify correct nav per surface

| Surface | Expected Nav | Must NOT have |
|---------|-------------|---------------|
| Marketplace pages | `<Nav>` | `<ShopfrontNav>`, admin sidebar |
| Tenant website | `<ShopfrontNav>` with tenant branding | `<Nav>` (marketplace) |
| Guest dashboard | Sidebar with guest links | Admin/manage links |
| Manage dashboard | Sidebar with manage links per listingId | Owner/admin links |
| Owner portal | Sidebar with owner links | Manager's listingId-specific links |
| Admin dashboard | Sidebar with admin links | Guest/manage sidebar |

```bash
# Check each layout for nav component:
grep -n "Nav\|Sidebar\|ShopfrontNav\|MobileSidebar" src/app/\[locale\]/guest/layout.tsx 2>/dev/null
grep -n "Nav\|Sidebar\|ShopfrontNav\|MobileSidebar" src/app/\[locale\]/manage/layout.tsx 2>/dev/null
grep -n "Nav\|Sidebar\|ShopfrontNav\|MobileSidebar" src/app/\[locale\]/owner/layout.tsx 2>/dev/null
grep -n "Nav\|Sidebar\|ShopfrontNav\|MobileSidebar" src/app/\[locale\]/admin/layout.tsx 2>/dev/null
```

### 8.2 Mobile navigation

Check every dashboard layout has a mobile hamburger menu:
```bash
grep -rn "MobileSidebar\|mobile.*menu\|hamburger\|md:hidden" src/app/\[locale\]/manage/ src/app/\[locale\]/owner/ src/app/\[locale\]/admin/ --include="*.tsx" -l
```

A dashboard layout without `<MobileSidebar>` on mobile = **HIGH** (all dashboard pages are unusable on phone).

### 8.3 Back navigation on detail pages

Every detail page must have a "Back" link or breadcrumb:
- `/guest/reservations/[id]` → back to "My Reservations"
- `/admin/listings/[id]` → back to "All Listings"
- `/admin/listings/[id]/config` → back to listing detail

```bash
grep -rn "back\|breadcrumb\|← \|‹ \|href.*\.\./" src/app/\[locale\]/guest/reservations/\[id\]/page.tsx src/app/\[locale\]/admin/listings/\[id\]/page.tsx 2>/dev/null
```

Missing back link on a detail page = **MEDIUM**.

---

## Audit Domain 9 — Cross-Role Data Flow Verification

### 9.1 Guest books → Manager sees booking

Trace the data flow end-to-end through the UI:

1. **Guest creates a booking** via `/en/book/[propertyId]`:
   - Does the booking summary page show the correct booking reference?
   - Does `/en/guest/reservations` show the new booking immediately (no stale cache)?

2. **Manager views the booking** via `/en/manage/[listingId]/bookings`:
   - Does the booking appear in the list?
   - Is the guest's name, room, dates, and status all correct?
   - Is there a "Check In" button that changes status to CHECKED_IN?
   - Is there a "Check Out" button after check-in?

3. **Guest sees updated status** in `/en/guest/reservations/[id]`:
   - After manager checks in the guest, does the reservation detail show `CHECKED_IN`?

For each step, read the relevant page file and verify:
- The correct API endpoint is called
- The response is rendered in the UI
- There is no hardcoded status

### 9.2 Owner changes branding → Tenant site updates

1. **Owner updates** primary color in `/en/owner/property` → saves to `/api/owner/branding`
2. **Tenant site** at `/en/[tenantSlug]` must reflect the new color via CSS variables

Check `TenantHomePage.tsx` for how `--tenant-primary` is set:
```bash
grep -n "tenant-primary\|style.*primary\|branding\|color" src/components/tenant/TenantHomePage.tsx | head -20
```

If the CSS variable is set via inline style from the branding data prop, verify the prop flows from the catch-all page → TenantHomePage.

### 9.3 Admin installs plugin → Manager sees it in sidebar

1. **Admin enables plugin** for a listing via `/en/admin/listings/[id]`
2. **Manager sidebar** at `/en/manage/[listingId]/layout.tsx` must show the new plugin's nav item

Check if the manager sidebar is static or dynamic:
```bash
grep -n "PluginShell\|plugins\|dynamic\|fetch" src/app/\[locale\]/manage/\[listingId\]/layout.tsx 2>/dev/null || echo "No layout found at this path"
```

If sidebar items are hardcoded (not fetched from plugin registry), enabling a plugin will not update the sidebar = **HIGH**.

---

## Audit Domain 10 — Security-in-UI Checks

### 10.1 No sensitive data in page source

Read the owner dashboard and admin pages. Verify that:
- API keys, Stripe keys, webhook secrets are NOT rendered into the DOM
- Settings pages that display credentials use `type="password"` inputs or masked display (`sk_live_****`)

```bash
grep -rn "sk_live\|pk_live\|STRIPE\|SECRET\|API_KEY\|webhook_secret" src/app/\[locale\]/ --include="*.tsx" | grep -v "//\|placeholder\|import\|process\.env"
```

Any secret rendered into client HTML = **CRITICAL**.

### 10.2 Confirm delete operations have confirmation dialogs

```bash
grep -rn "delete\|Delete\|remove\|Remove" src/app/\[locale\]/manage/ src/app/\[locale\]/admin/ --include="*.tsx" | grep -v "//\|className\|aria\|import" | grep "onClick\|handleDelete" | head -20
```

For each delete action found, check if there's a `confirm()\|window.confirm\|<Modal\|<Dialog\|AlertDialog\|are you sure` guard. A delete without confirmation = **MEDIUM** for data, **HIGH** for irreversible actions (delete listing, delete room, remove staff).

### 10.3 CSRF — verify all mutation forms use API calls, not native form POST

```bash
grep -rn "method=\"post\"\|action=\|<form " src/app/\[locale\]/ src/components/ --include="*.tsx" | grep -iv "aria\|//\|className\|data-" | head -20
```

Any `<form method="post" action="...">` that submits to an API route directly (not via `fetch()`) bypasses the CSRF protection layer = **HIGH**.

---

## Findings Report

Append to existing `FRONTEND_AUDIT_REPORT.md`:

```markdown
## Phase 2 — Role-Specific & Behavioral Audit

### Domain 1: Role-Gated Visibility
...

### Domain 2: Plugin-Gated UI
...

### Domain 3: Form State Completeness
...

### Domain 4: Empty States
...

### Domain 5: Loading States
...

### Domain 6: Accessibility
...

### Domain 7: Internationalization
...

### Domain 8: Navigation Consistency
...

### Domain 9: Cross-Role Data Flow
...

### Domain 10: Security-in-UI
...

### Phase 2 Summary
- HIGH: X found, X fixed
- MEDIUM: X found, X fixed (or deferred to backlog)
- LOW: X found, documented only
```

---

## Fix Priority

**Fix immediately (HIGH):**
- Any role seeing another role's data or actions
- Missing mobile nav in any dashboard
- Double h1 on any page
- Images without alt text
- Secrets rendered into HTML
- Delete without confirmation on irreversible actions
- Native form POST bypassing CSRF

**Document and defer (MEDIUM/LOW):**
- Missing empty states
- Missing loading skeletons on secondary pages
- Hardcoded i18n strings
- RTL logical property issues
- Missing back navigation on detail pages

---

## Verification

```bash
npm test                                              # ≥ 1177 pass
npx playwright test --reporter=list 2>&1 | tail -3   # 376/376
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l      # 0
npm run lint 2>&1 | grep "error" | grep -v "no-require-imports" | wc -l  # 0
```

---

## Commit Strategy

```bash
git add src/app/[locale]/ src/components/
git commit -m "fix(frontend): role-gated nav, plan-gated UI, accessibility, form guards"

git add FRONTEND_AUDIT_REPORT.md AGENT_LOGBOOK.md
git commit -m "docs: phase 2 frontend audit report"
```
