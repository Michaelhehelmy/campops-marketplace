# OpenCode Agent Prompt: Tenant System Deep Audit & Hardening

## Mission

Perform a complete production-readiness audit of the entire tenant system: registration wizard, tenant website rendering, domain/subdomain provisioning, middleware routing, owner dashboard, guest flows, and all supporting APIs. Fix every identified issue. Do not touch plugins or the military-grade infra scripts.

**Baseline**: 1165/1165 tests pass. Maintain this.

---

## Part 0 — Architecture Map (Read First)

Before changing anything, read every file in this map:

### Tenant Registration Wizard
```
src/app/[locale]/list-your-camp/page.tsx           — Step 1: Account creation
src/app/[locale]/list-your-camp/branding/page.tsx  — Step 2: Branding/name/logo
src/app/[locale]/list-your-camp/plan/page.tsx       — Step 3: Plan selection
src/app/[locale]/list-your-camp/property/page.tsx   — Step 4: Property details (if any)
src/app/[locale]/list-your-camp/success/page.tsx    — Step 5: Confirmation
src/app/[locale]/list-your-camp/layout.tsx          — Wizard shell/progress
```

### Tenant Website Rendering
```
src/app/[locale]/[tenantSlug]/[[...slug]]/page.tsx  — Catch-all tenant page router
src/components/tenant/TenantHomePage.tsx
src/components/tenant/TenantAboutPage.tsx
src/components/tenant/TenantServicesPage.tsx
src/components/tenant/TenantGalleryPage.tsx
src/components/tenant/TenantRoomsPage.tsx
src/components/tenant/TenantContactPage.tsx
src/lib/TenantContext.tsx
```

### Domain & Routing
```
src/middleware.ts                                           — Subdomain/custom domain routing
src/app/api/tenant/resolve/route.ts                        — Tenant resolution API
src/app/api/tenant/pages/route.ts                          — CMS pages API
src/app/api/tenant/serve/route.ts                          — Tenant asset serving
src/lib/domain-provisioning.ts                             — Cloudflare DNS API
src/lib/listeners/domainProvisioningListener.ts            — Plan-upgrade hook listener
src/app/api/manage/[listingId]/domain/route.ts             — Domain management API
src/app/api/domains/check/route.ts                         — Domain availability check
```

### Owner & Manager Flows
```
src/app/[locale]/owner/dashboard/page.tsx
src/app/[locale]/owner/bookings/page.tsx
src/app/[locale]/owner/property/page.tsx
src/app/[locale]/owner/revenue/page.tsx
src/app/[locale]/manage/[listingId]/page.tsx               — Manager dashboard root
src/app/[locale]/manage/[listingId]/bookings/page.tsx
src/app/[locale]/manage/[listingId]/guests/page.tsx
src/app/[locale]/manage/[listingId]/rooms/page.tsx
src/app/[locale]/manage/[listingId]/settings/page.tsx
src/app/[locale]/manage/[listingId]/plugins/page.tsx
src/app/api/owner/me/route.ts
src/app/api/owner/upgrade/route.ts
src/app/api/manage/[listingId]/domain/route.ts
```

### Guest Flow
```
src/app/[locale]/page.tsx                       — Marketplace homepage
src/app/[locale]/stay/[slug]/page.tsx           — Public listing detail
src/app/[locale]/book/[propertyId]/page.tsx     — Booking form
src/app/[locale]/book/summary/page.tsx          — Booking summary/confirmation
src/app/[locale]/guest/page.tsx                 — Guest dashboard
src/app/[locale]/guest/reservations/page.tsx
src/app/[locale]/guest/reservations/[id]/page.tsx
src/app/[locale]/guest/profile/page.tsx
src/app/api/public/listings/route.ts
src/app/api/public/tenant-listing/route.ts
src/app/api/public/featured-listings/route.ts
src/app/api/guest/dashboard/route.ts
src/app/api/guest/profile/route.ts
```

### Auth & Plans
```
src/app/[locale]/login/page.tsx
src/app/api/auth/[[...better-auth]]/route.ts
src/app/api/auth/me/route.ts
src/app/api/listing-access/route.ts
src/lib/auth-middleware.ts
```

---

## Part 1 — Registration Wizard Audit

### 1.1 sessionStorage State Machine (Critical)

**File**: `src/app/[locale]/list-your-camp/page.tsx:24`

The wizard uses `sessionStorage.setItem('reg_step1', ...)` to pass form data between steps. This has multiple production problems:

- **No server-side validation between steps** — a user can navigate directly to `/list-your-camp/plan` without completing step 1
- **State lost on tab close, refresh, or link share** — hard crash with blank form data on subsequent steps
- **No cleanup** — `reg_step1`, `reg_step2`, etc. keys accumulate in storage forever

**Audit task**: Read all wizard step files. Map exactly which `sessionStorage` keys are written/read at each step. Then fix:

1. Add a guard to each step page: if the required prior-step storage key is missing, redirect back to step 1
2. Add `sessionStorage.removeItem` calls in the `success` page to clean up all wizard keys
3. Document whether the actual property/user creation happens at step 3 (plan) or success — trace the API call

### 1.2 Account Creation Timing

**File**: `src/app/[locale]/list-your-camp/page.tsx`

Determine: does step 1 create the user account immediately via API, or does it just buffer the data in sessionStorage for batch submission later? Read all steps and trace every `fetch`/`POST` call.

If the user is created lazily (at plan selection or success):
- A user can abandon after step 1 and leave orphan sessionStorage data
- Two browser tabs can create duplicate accounts

If the user is created eagerly (at step 1 submit):
- What happens if the email already exists? Is the error surfaced to the user?
- Is the new user immediately logged in, or does the subsequent steps run unauthenticated?

Fix whatever is broken. Ensure:
- Email uniqueness is enforced with a clear error message
- The logged-in state is established before entering property-creation steps
- The success page clears wizard state

### 1.3 Plan Downgrade Guard

**File**: `src/app/[locale]/list-your-camp/plan/page.tsx`

When a user selects a plan during registration, verify:
- Is there any restriction that prevents selecting `ultimate` without going through `premium` first?
- Is the `basic` plan marked clearly as "no subdomain, marketplace listing only"?
- Does plan selection actually call `POST /api/owner/upgrade` or is it just stored in sessionStorage?

### 1.4 Branding Step Completeness

**File**: `src/app/[locale]/list-your-camp/branding/page.tsx`

Read and verify:
- Are all required branding fields validated (name, slug uniqueness)?
- Is the slug checked for uniqueness against `properties.slug` before advancing?
- Are special characters in slug sanitized?

Add a `GET /api/domains/check?slug=xxx` call before advancing from branding step to confirm slug availability.

---

## Part 2 — Tenant Resolution Audit

### 2.1 Hardcoded IP Bypass (Security Issue)

**File**: `src/app/api/tenant/resolve/route.ts:16-20`

```typescript
if (hostname === '127.0.0.1') {
  return NextResponse.json({
    property: { id: '3', name: 'Acacia Camp', slug: 'acacia', plan: 'ultimate' },
  });
}
```

This hardcoded bypass is **in production**. It means anyone who can spoof `x-forwarded-host: 127.0.0.1` or route through localhost gets an `ultimate`-plan property for free.

**Fix**: Gate this behind `NODE_ENV !== 'production'`:
```typescript
if (process.env.NODE_ENV !== 'production' && hostname === '127.0.0.1') {
  // development shortcut only
}
```

### 2.2 Plan Enforcement in Resolver

**Current logic** (tenant/resolve):
- `basic` plan + subdomain → 404 ✅
- `basic` plan + custom domain → 404 ✅
- `premium` plan + subdomain → resolves ✅
- `premium` plan + custom domain → resolves (should this be blocked?) ⚠️

Verify: can a `premium` tenant set a custom domain? The `domain/route.ts` only provisions custom domains for `ultimate` plan, but if someone manually sets `custom_domain` in the DB, the resolver doesn't block it.

**Fix**: In the resolve route, after finding a property by custom domain, add:
```typescript
if (resolvedProperty.plan !== 'ultimate') {
  return NextResponse.json({ property: null, error: 'Custom domain requires ultimate plan' }, { status: 403 });
}
```

### 2.3 Tenant Resolution Caching

**File**: `src/middleware.ts:131-134`

```typescript
const res = await fetch(
  `${API_URL}/api/tenant/resolve?host=...`,
  { next: { revalidate: 60 } }
);
```

`revalidate: 60` caches for 60 seconds — this is Next.js fetch cache, not Redis. In cluster mode (2 instances), each worker has its own cache, so a newly provisioned domain can take up to 2 minutes to resolve on all workers.

**Audit**: Check if there's a cache invalidation mechanism when a domain is provisioned or removed. If not, document this as a known delay in the runbooks.

### 2.4 Tenant Subpage Hardcoding

**File**: `src/middleware.ts:150`

```typescript
const TENANT_SUBPAGES = ['/about', '/services', '/gallery', '/rooms', '/room-types', '/contact', '/book'];
```

This static list means adding a new tenant page requires a code deploy + redeploy. 

**Audit**: Check if there's a dynamic CMS pages system via `api/tenant/pages`. If so, the middleware should query that (with caching) instead of using the hardcoded list, or at minimum the list should match what `PAGE_ROUTES` in `[tenantSlug]/page.tsx` actually supports.

---

## Part 3 — Tenant Website Rendering Audit

### 3.1 Missing SEO / generateMetadata

**File**: `src/app/[locale]/[tenantSlug]/[[...slug]]/page.tsx`

Read the full file. Check if `generateMetadata` is exported. If not, every tenant page has:
- Generic `<title>` (no property name)
- No Open Graph tags
- No per-page description

**Add `generateMetadata`**:
```typescript
export async function generateMetadata({ params }: Props) {
  const tenant = resolveTenantBySlug(params.tenantSlug);
  if (!tenant) return {};
  const slug = params.slug?.[0] ?? '';
  const pageTitle = slug ? `${slug.charAt(0).toUpperCase() + slug.slice(1)} — ${tenant.name}` : tenant.name;
  return {
    title: pageTitle,
    description: tenant.description ?? `${tenant.name} — ${tenant.city}, ${tenant.country}`,
    openGraph: {
      title: pageTitle,
      description: tenant.description ?? undefined,
      siteName: tenant.name,
    },
  };
}
```

### 3.2 Plan Guard on Tenant Website

**File**: `src/app/[locale]/[tenantSlug]/[[...slug]]/page.tsx`

Read the full file. Check if `basic`-plan tenants are blocked from rendering their own website. The middleware redirects them, but the page itself should also guard in case the rewrite happens without the middleware (e.g., direct Next.js routing in dev):

```typescript
if (tenant.plan === 'basic') {
  redirect(`/${params.locale}/stay/${tenant.slug}`);
}
```

### 3.3 Tenant Component Completeness

Read each `TenantXxxPage` component:
```
src/components/tenant/TenantHomePage.tsx
src/components/tenant/TenantAboutPage.tsx
src/components/tenant/TenantServicesPage.tsx
src/components/tenant/TenantGalleryPage.tsx
src/components/tenant/TenantRoomsPage.tsx
src/components/tenant/TenantContactPage.tsx
```

For each, verify:
- Does it render correctly when branding/settings are empty `{}`?
- Does it use the `tenant.branding` color theme?
- Does the "Book Now" CTA point to the correct booking URL for that specific tenant?
- Is there a loading/skeleton state?
- Does the contact page have a working form, or just display info?

Fix any pages that crash on empty data or missing branding fields.

### 3.4 Booking CTA in Tenant Website

The tenant website has a `/book` subpage in `TENANT_SUBPAGES`. Verify that clicking "Book Now" on the tenant website navigates to the correct booking flow and pre-fills the `propertyId`. Check `src/app/[locale]/book/[propertyId]/page.tsx` for how it receives and validates the property context.

---

## Part 4 — Domain Provisioning Audit

### 4.1 Instant Verification Without DNS Propagation Check

**File**: `src/app/api/manage/[listingId]/domain/route.ts:125`

```typescript
domain_verified = 1
```

This sets `domain_verified = 1` immediately when the DNS record is *created*, not when it *propagates*. A tenant can have a custom domain that shows as verified but DNS hasn't propagated yet (up to 48h).

**Fix**: Change the flow:
1. On `POST /domain`: provision DNS, set `domain_verified = 0`, return `{ pending: true }`
2. Add `GET /domain/verify` endpoint that checks DNS resolution (using `dns.resolve()` or a fetch to the domain) and sets `domain_verified = 1` only when it actually resolves

Alternatively, document this as a known 5-15 minute propagation window and show the user a "pending" badge in the UI.

**Read** `src/app/api/manage/[listingId]/domain/route.ts` fully first to understand current state.

### 4.2 Domain Provisioning Race Condition

**File**: `src/lib/domain-provisioning.ts`

The provisioning flow:
1. Check if DNS record exists → skip if it does
2. Create DNS record if not

Between steps 1 and 2, two concurrent requests for the same domain would both get "not found" and try to create, causing a Cloudflare API error for duplicate record.

**Fix**: Add a DB-level unique constraint or an in-flight lock before calling Cloudflare:
```typescript
// Before calling createDnsRecord, mark provisioning in progress
await db.execute(
  `UPDATE properties SET provisioning_status = 'in_progress' WHERE id = ? AND provisioning_status IS NULL`,
  [siteId]
);
// Check rows changed — if 0, another request is already provisioning
```

### 4.3 Missing Cloudflare Credentials Handling

**File**: `src/lib/domain-provisioning.ts`

Read the top of the file. Check how it handles missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ZONE_ID`. If it throws unhandled errors, all domain provisioning silently fails in environments without Cloudflare set up.

Ensure there's a clear, actionable error message when credentials are missing, rather than a cryptic `fetch failed`.

---

## Part 5 — Owner Upgrade Flow Audit

### 5.1 Plan Upgrade API

**File**: `src/app/api/owner/upgrade/route.ts`

Read the full file. Verify:
- Is plan upgrade gated to the current owner of the property?
- Does it fire `CORE_SITE_PLAN_UPGRADED` hook to trigger domain provisioning?
- Is there a payment step, or is the upgrade free?
- What prevents a `basic` tenant from calling `POST /api/owner/upgrade` with `{ plan: 'ultimate' }` without paying?

If there's no payment gate, this is a free upgrade vulnerability.

### 5.2 Owner `me` Route

**File**: `src/app/api/owner/me/route.ts`

Read fully. Verify:
- Returns the correct property for the authenticated user
- Handles the case where a user has multiple properties
- Returns plan, subdomain, custom_domain, domain_verified correctly

---

## Part 6 — Guest Flow Audit

### 6.1 Public Listings API

**File**: `src/app/api/public/listings/route.ts`

Read fully. Verify:
- Pagination is implemented (not returning all rows unbounded)
- Search/filter by city, country, category works
- `basic`-plan properties appear in marketplace ✅ (they should)
- Inactive properties (`is_active = 0`) are excluded ✅

### 6.2 Booking Flow

Read the complete booking flow:
- `src/app/[locale]/book/[propertyId]/page.tsx`
- `src/app/[locale]/book/summary/page.tsx`

Verify:
- Is the guest required to be logged in before booking?
- Is there a room availability check before submission?
- What happens if two guests try to book the same room for the same dates simultaneously?
- Is there an email confirmation sent after booking?

### 6.3 Guest Reservation Detail

**File**: `src/app/[locale]/guest/reservations/[id]/page.tsx`

Read and verify:
- Can a guest access reservations belonging to other guests by changing the `id` in the URL?
- Is there a proper authorization check (`booking.guest_id = current_user.id`)?

---

## Part 7 — Auth Flow Audit

### 7.1 Login Page

**File**: `src/app/[locale]/login/page.tsx`

Read fully. Verify:
- Does it redirect authenticated users away from the login page?
- After login, does it redirect to the correct dashboard based on role (`owner` → `/owner/dashboard`, `manager` → `/manage/[id]`, `guest` → `/guest`, `admin` → `/admin`)?
- Is there a "forgot password" flow?

### 7.2 Listing Access Middleware

**File**: `src/app/api/listing-access/route.ts` and `src/lib/auth-middleware.ts`

Read both. Verify `requireListingAccess` correctly:
- Blocks guests from accessing manager routes
- Blocks managers from accessing other properties' routes
- Allows `marketplace_master` role to access all listings
- Returns a proper 401/403 with a JSON body (not an HTML error page)

---

## Part 8 — End-to-End Flow Tests

After fixing the above, write or update Playwright tests for the critical happy paths:

### Test 1: New Owner Registration
```
1. Visit /en/list-your-camp
2. Fill account form → next
3. Fill branding (name, slug) → check slug availability → next
4. Select basic plan → submit
5. Assert: redirected to /en/list-your-camp/success OR owner dashboard
6. Assert: property visible in /api/properties
7. Assert: sessionStorage wizard keys are cleaned up
```

### Test 2: Tenant Website Rendering (Premium)
```
1. Set up premium property with subdomain in DB
2. Visit http://[subdomain].sinaicamps.com (or equivalent in test)
3. Assert: middleware rewrites to /en/[slug]
4. Assert: TenantHomePage renders with correct name/branding
5. Assert: /about, /services, /rooms sub-pages render without 404
```

### Test 3: Domain Provisioning
```
1. POST /api/manage/[id]/domain { domain: "test.sinaicamps.com" }
2. Assert: 200, plan upgraded to premium
3. Assert: property.subdomain = "test"
4. Assert: audit log entry created
```

### Test 4: Guest Booking
```
1. Login as guest
2. Visit /en/stay/[slug]
3. Click Book Now
4. Fill booking form
5. Assert: booking created, confirmation shown
6. Visit /en/guest/reservations
7. Assert: booking appears in list
```

### Test 5: Authorization Isolation
```
1. Login as guest A — create booking
2. Login as guest B — attempt GET /api/guest/reservations/[guestA_booking_id]
3. Assert: 403 or 404
```

---

## Part 9 — Issues Found by Code Reading

Record every issue found during reading in a list BEFORE starting fixes. Format:
```
[SEVERITY: critical/high/medium/low] [FILE:LINE] Description
```

Severity guide:
- **Critical**: security vulnerability, data leak, money bypass
- **High**: user-visible breakage, data loss risk
- **Medium**: UX problem, missing validation
- **Low**: code smell, missing error message

---

## Part 10 — Run Tests & Verify

```bash
# After all fixes
npm test 2>&1 | tail -5
# Must be: 1165+ pass, 0 fail

# Type check
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

# Lint
npm run lint 2>&1 | grep " error " | head -20

# Run E2E if available
npx playwright test --reporter=list 2>&1 | tail -20
```

---

## Part 11 — Update AGENT_LOGBOOK.md

Append a dated entry covering:
- All issues found (copy the severity list from Part 9)
- Files changed
- Any DB schema changes made (if any)
- New test coverage added
- Known remaining issues with mitigation plan
