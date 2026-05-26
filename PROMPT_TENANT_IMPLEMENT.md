# OpenCode Agent Prompt: Tenant System — 100% Implementation & Hardening

## Context

Audit complete. **1164/1164 tests passing, 130/130 files.** 14 issues found and partially fixed.  
This prompt is for agents to: verify every fix is correctly in place, fill any remaining gaps, write tests, and harden the weak spots the audit didn't fully address.

**DO NOT** touch plugins, infra scripts, or the military-grade security layer.

---

## Part 0 — Baseline

```bash
npm test 2>&1 | tail -5
# Must show: 1164+ passed, 0 failed
git status --short   # understand what's already changed
```

Read `AGENT_LOGBOOK.md` lines 765–end before touching any file.

---

## Part 1 — Verify All 14 Audit Fixes Are In Place

Run each verification. For any that fail, implement the fix as specified.

### Fix 1 ✅ Verify — `127.0.0.1` bypass
**File**: `src/app/api/tenant/resolve/route.ts`

```bash
grep -n "127.0.0.1" src/app/api/tenant/resolve/route.ts
```
Expected: `NODE_ENV !== 'production'` guards the bypass. If not:
```typescript
// Replace the bypass block with:
if (process.env.NODE_ENV !== 'production' && hostname === '127.0.0.1') {
  return NextResponse.json({
    property: { id: '3', name: 'Acacia Camp', slug: 'acacia', plan: 'ultimate' },
  });
}
```

### Fix 2 ✅ Verify — Registration creates session
**File**: `src/app/[locale]/list-your-camp/plan/page.tsx`

```bash
grep -n "authClient.signIn.email\|auth/callback" src/app/[locale]/list-your-camp/plan/page.tsx
```
Expected: `authClient.signIn.email({ email, password })` is called after `POST /api/owner/register`. No reference to `/api/auth/callback`.

### Fix 3 ✅ Verify — sessionStorage cleanup
**File**: `src/app/[locale]/list-your-camp/plan/page.tsx`

```bash
grep -n "sessionStorage.removeItem" src/app/[locale]/list-your-camp/plan/page.tsx
```
Expected: `removeItem('reg_step1')`, `removeItem('reg_step2')`, `removeItem('reg_branding')` all present.

### Fix 4 ✅ Verify — Wizard step guards
```bash
grep -n "router.replace\|sessionStorage.getItem" src/app/[locale]/list-your-camp/branding/page.tsx
grep -n "router.replace\|sessionStorage.getItem" src/app/[locale]/list-your-camp/plan/page.tsx
```
Expected:
- Branding page: redirects to step 1 if `reg_step1` missing
- Plan page: redirects to step 1 if `reg_step1` OR `reg_step2` missing

### Fix 5 ✅ Verify — Success page uses correct plan params
**File**: `src/app/[locale]/list-your-camp/success/page.tsx`

Read the file fully. Verify the plan value from `?plan=` query param is compared against `'premium'`/`'ultimate'` (not `'subdomain'`/`'custom_domain'`). Dashboard redirect URL must be:
- `basic` → `/${locale}/manage/[slug]` or `/${locale}/owner/dashboard`
- `premium` → same, with subdomain mention
- `ultimate` → same, with custom domain mention

If success page uses wrong plan keys, fix them to match what plan page sends.

### Fix 6 ✅ Verify — `generateMetadata` on tenant catch-all
```bash
grep -n "generateMetadata" "src/app/[locale]/[tenantSlug]/[[...slug]]/page.tsx"
```
Expected: exported `generateMetadata` function that returns `title`, `description`, and `openGraph`. If missing, add:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = resolveTenantBySlug(params.tenantSlug);
  if (!tenant) return {};
  const pageSlug = params.slug?.[0] ?? '';
  const pageTitle = pageSlug
    ? `${pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1)} — ${tenant.name}`
    : tenant.name;
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
Add `import type { Metadata } from 'next'` at the top of the file.

### Fix 7 ✅ Verify — Basic plan guard in tenant page
```bash
grep -n "plan.*basic\|redirect" "src/app/[locale]/[tenantSlug]/[[...slug]]/page.tsx"
```
Expected:
```typescript
if (tenant.plan === 'basic') {
  redirect(`/${locale}/stay/${tenant.slug}`);
}
```
If missing, add it immediately after `if (!tenant) notFound();`.

### Fix 8 ✅ Verify — Slug uniqueness in branding
```bash
grep -n "domains/check\|slug.*available\|checkData" src/app/[locale]/list-your-camp/branding/page.tsx
```
Expected: a `fetch('/api/domains/check?domain=...')` call on form submit with error display.

Then verify the check endpoint itself checks `slug` column:
```bash
grep -n "slug\|subdomain\|custom_domain" src/app/api/domains/check/route.ts
```
Expected: query checks `slug = ?` OR `subdomain = ?` OR `custom_domain = ?` before returning `available`.

If `domains/check` only checks `subdomain` and `custom_domain` but not `slug`, fix it:
```typescript
const existing = db.prepare(`
  SELECT id FROM properties
  WHERE slug = ? OR subdomain = ? OR custom_domain = ?
  LIMIT 1
`).get(domain, domain, domain);
return NextResponse.json({ available: !existing });
```

### Fix 9 ✅ Verify — `dns_verified = 0` on creation
```bash
grep -n "domain_verified\|dns_verified" src/app/api/manage/[listingId]/domain/route.ts
```
Expected: `domain_verified = 0` in the UPDATE statement (not `= 1`).

### Fix 10 ✅ Verify — Custom domain plan gating
```bash
grep -n "ultimate\|custom domain" src/app/api/tenant/resolve/route.ts
```
Expected: block non-`ultimate` plan tenants from resolving via custom domain (not subdomain).

### Fix 11 ✅ Verify — Booking CTAs include `propertyId`
```bash
grep -n "book/" src/components/tenant/TenantHomePage.tsx src/components/tenant/TenantRoomsPage.tsx
```
Expected: links are `/${locale}/book/${tenant.id}` (not `/${locale}/book` without ID).

If missing in either file, fix:
```tsx
// TenantHomePage.tsx — hero CTA
<a href={`/${locale}/book/${tenant.id}`}>Book Now</a>

// TenantRoomsPage.tsx — per-room CTA  
<a href={`/${locale}/book/${tenant.id}`}>Book this room</a>
```

### Fix 12 ✅ Verify — Guest reservation auth server-side
**File**: Check the API route, not the page:
```bash
find src/app/api -name "route.ts" | xargs grep -l "reservations" 2>/dev/null
```
Find the handler for `GET /api/guest/reservations/[id]`. Read it fully.

It must:
1. Call `auth.api.getSession({ headers: req.headers })` — NOT accept `userId` as query param
2. Return 401 if no session
3. Return 404/403 if `booking.guest_user_id !== session.user.id`

If the check is missing, add it. The IDOR fix is critical — a guest must not read another guest's booking.

**Fix pattern**:
```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await db.prepare(
    `SELECT * FROM bookings WHERE id = ? LIMIT 1`
  ).get(params.id) as any;

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // IDOR guard: booking must belong to the authenticated user
  if (booking.guest_user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ booking });
}
```

### Fix 13 ✅ Verify — Listing-access error response
```bash
grep -n "ok: true\|Internal server error" src/app/api/listing-access/route.ts
```
Expected: catch block returns `{ error: 'Internal server error' }` with status 500. No `ok: true` in error path.

### Fix 14 ✅ Verify — `reg_branding` cleanup on plan page
```bash
grep -n "reg_branding" src/app/[locale]/list-your-camp/plan/page.tsx
```
Expected: `sessionStorage.removeItem('reg_branding')` present in the success path.

---

## Part 2 — Remaining Gaps Not Covered by the 14 Fixes

### 2.1 Tenant Internal Navigation Links (Medium)

**Files**: `src/components/tenant/TenantHomePage.tsx`, all other `TenantXxxPage` components

Tenant pages contain navigation links like `/${locale}/about`, `/${locale}/rooms`, `/${locale}/contact`. These work via the middleware rewrite on custom domains but **break in development** and **break if a user copies the URL**.

Read each tenant component and audit every `href`:
- Links to tenant subpages must be relative paths that the middleware can rewrite
- In dev, the URL is `localhost:3000/en/acacia-camp/about` — the `/${locale}/about` link would go to `localhost:3000/en/about` (marketplace about page, NOT tenant)

**Fix**: Use the `tenantSlug` for internal navigation when NOT on a custom domain:
```tsx
// Use this helper in all tenant components
function tenantHref(locale: string, tenant: TenantData, path: string): string {
  // On custom domain this is served via rewrite, so relative path works via middleware
  // But include slug for safety in all direct URL contexts
  return `/${locale}/${tenant.slug}${path}`;
}

// Usage:
<a href={tenantHref(locale, tenant, '/about')}>About</a>
<a href={tenantHref(locale, tenant, '/rooms')}>Rooms</a>
<a href={tenantHref(locale, tenant, '/contact')}>Contact</a>
```

Apply this to all tenant components that have navigation links.

### 2.2 `/api/owner/register` — Audit the Registration API (High)

**Find**: `src/app/api/owner/register/route.ts` (or wherever the registration API is)
```bash
find src/app/api -name "route.ts" | xargs grep -l "owner.*register\|register.*owner" 2>/dev/null
```

Read it fully. Verify:
1. **Email uniqueness**: returns 409 if email already registered in `users` table
2. **Slug uniqueness**: returns 409 if slug/subdomain already taken
3. **Password hashing**: never stores plaintext password — delegates to Better Auth or bcrypt
4. **Atomic creation**: user + property are created in a DB transaction, not two separate inserts (partial creation leaves orphan records)
5. **Plan default**: if no plan supplied, defaults to `'basic'`

If any of these are missing, add them. Pattern for atomic user+property creation:
```typescript
const result = await db.transaction(async (tx) => {
  // 1. Create user via Better Auth OR direct insert with hashed password
  // 2. Create property linked to user
  // 3. Return { userId, propertyId, slug }
});
```

### 2.3 Plan Upgrade Payment Gate (Critical)

**File**: `src/app/api/owner/upgrade/route.ts`

Read the full file. Check: does it enforce payment before upgrading to `premium` or `ultimate`?

If `plan` can be changed to `'ultimate'` by POSTing without a real Stripe payment method:
- Add a check: `if (newPlan !== 'basic' && !stripe_payment_method_id) return 403`
- Or, if Stripe is not yet integrated, add a comment + flag: `PAYMENT_GATE_DISABLED=true` env var

The plan page already sends `stripe_payment_method_id: 'pm_placeholder'` — meaning any user can upgrade for free right now. This must be either gated behind real Stripe or explicitly documented as a dev-only bypass.

Add to `.env.example`:
```
# Set to 'false' in production to enforce Stripe payment on plan upgrades
SKIP_PAYMENT_GATE=true
```

Then in the upgrade route:
```typescript
if (newPlan !== 'basic' && process.env.SKIP_PAYMENT_GATE !== 'true') {
  if (!body.stripe_payment_method_id || body.stripe_payment_method_id === 'pm_placeholder') {
    return NextResponse.json({ error: 'Payment method required to upgrade plan' }, { status: 402 });
  }
}
```

### 2.4 Tenant Resolution — Missing `branding` and `settings` in Response (Medium)

**File**: `src/app/api/tenant/resolve/route.ts:105-112`

Current response returns only `id, name, slug, plan`. The middleware injects these as headers. But tenant pages also need `branding` and `settings` for colors/fonts.

Currently those come from a direct DB call in the page (`resolveTenantBySlug`). This is fine but means **two separate DB reads per page load** (once in middleware via resolve API, once in the page).

This is acceptable for now — document it as a known inefficiency.

Verify it at least works: the tenant page calls `resolveTenantBySlug` directly (not from the resolve API). If it uses the API, fix it to use direct DB.

### 2.5 Domain Verification Endpoint (Medium)

**Issue**: Domains are created with `domain_verified = 0` but there's no automated way to verify them.

**Create**: `src/app/api/manage/[listingId]/domain/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import dns from 'dns/promises';

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  const session = await requireListingAccess(req, params.listingId, ['manager', 'marketplace_master']);
  if (isErrorResponse(session)) return session;

  const property = db.prepare(
    `SELECT custom_domain, subdomain FROM properties WHERE id = ? AND is_active = 1`
  ).get(params.listingId) as any;

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const domainToCheck = property.custom_domain || property.subdomain;
  if (!domainToCheck) return NextResponse.json({ error: 'No domain to verify' }, { status: 400 });

  try {
    await dns.resolve(domainToCheck);
    db.prepare(`UPDATE properties SET domain_verified = 1 WHERE id = ?`).run(params.listingId);
    return NextResponse.json({ verified: true, domain: domainToCheck });
  } catch {
    return NextResponse.json({ verified: false, domain: domainToCheck, message: 'DNS not yet propagated' });
  }
}
```

---

## Part 3 — Write Missing Tests

### 3.1 Tenant Resolution Unit Tests
**File**: `src/app/api/tenant/resolve/__tests__/route.test.ts` (create if not exists)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GET /api/tenant/resolve', () => {
  it('returns 400 when host param is missing', async () => { ... });
  it('returns 404 for basic plan on subdomain', async () => { ... });
  it('returns 403 for non-ultimate plan on custom domain', async () => { ... });
  it('returns property for valid premium subdomain', async () => { ... });
  it('does NOT apply 127.0.0.1 bypass in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // Request with host=127.0.0.1 should NOT return Acacia Camp
  });
});
```

### 3.2 Domain Check Unit Tests
**File**: `src/app/api/domains/check/__tests__/route.test.ts` (create if not exists)

```typescript
describe('GET /api/domains/check', () => {
  it('returns available=false when slug already taken', async () => { ... });
  it('returns available=false when subdomain already taken', async () => { ... });
  it('returns available=false when custom_domain already taken', async () => { ... });
  it('returns available=true for unused slug', async () => { ... });
  it('returns available=false for reserved slugs (admin, api, manage)', async () => { ... });
});
```

### 3.3 Guest Reservation IDOR Test
**File**: Find the reservations API test file or create one

```typescript
describe('GET /api/guest/reservations/[id]', () => {
  it('returns 401 when unauthenticated', async () => { ... });
  it('returns 403 when authenticated as different user', async () => {
    // Create booking for user A, request as user B — must get 403
  });
  it('returns booking when requested by owner', async () => { ... });
});
```

### 3.4 Listing Access Error Response Test
**File**: `src/app/api/listing-access/__tests__/route.test.ts`

```typescript
it('returns JSON error on server error (not ok:true)', async () => {
  // Simulate DB throwing, expect { error: 'Internal server error' } with 500
  // NOT { ok: true }
});
```

---

## Part 4 — Reserved Slugs Protection

**File**: `src/app/api/domains/check/route.ts`

Add a reserved slugs blocklist to prevent tenants from taking system paths:

```typescript
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'manage', 'owner', 'guest', 'book', 'stay',
  'login', 'logout', 'auth', 'search', 'docs', 'health',
  'metrics', 'status', 'support', 'help', 'www', 'app',
  'dashboard', 'settings', 'plugins', 'stripe', 'paymob',
]);

// At the start of the check:
if (RESERVED_SLUGS.has(domain.toLowerCase())) {
  return NextResponse.json({ available: false, reason: 'reserved' });
}
```

Also add validation: slugs must be 3-50 chars, lowercase alphanumeric + hyphens only:
```typescript
if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(domain)) {
  return NextResponse.json({ available: false, reason: 'invalid_format' });
}
```

---

## Part 5 — Success Page Full Audit

**File**: `src/app/[locale]/list-your-camp/success/page.tsx`

Read the full file. Verify ALL of:

1. Reads `?plan=` and `?slug=` from URL searchParams (set by plan page: `?plan=${selected}&slug=${step2.slug}`)
2. Shows different UI for `basic`, `premium`, `ultimate`
3. For `premium`/`ultimate` — shows the subdomain/custom domain as confirmed
4. Has a "Go to Dashboard" button pointing to `/${locale}/manage/${slug}` (not a hardcoded path)
5. Does NOT read from sessionStorage (those were cleared by the plan page before redirect)
6. Handles missing `?slug` gracefully (redirect to owner dashboard root)

Fix anything that doesn't match the above spec.

---

## Part 6 — Run Full Verification

```bash
# Tests must pass
npm test 2>&1 | tail -5
# Expected: 1164+ pass, 0 fail

# TypeScript — 0 errors in all touched files
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

# Lint
npm run lint 2>&1 | grep " error " | head -20

# Check all new route files are registered
find src/app/api -name "route.ts" | wc -l
```

---

## Part 7 — Update AGENT_LOGBOOK.md

Append a dated entry:
- List every file changed
- Note which of the 14 audit fixes were already in place vs needed additional work
- Record the reserved slugs list and format validation rules
- Note the SKIP_PAYMENT_GATE env var added
- Record any test count delta
- Add new gotchas discovered during implementation
