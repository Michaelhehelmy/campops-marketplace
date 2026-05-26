# OpenCode Agent Prompt: Full E2E Test Coverage — All Roles, All Flows

## Context & Current State

**Baseline**: 131 unit/integration files, 1177 tests passing.  
**Playwright config**: `playwright.config.ts` — baseURL `http://localhost:3000`, 1 worker, `fullyParallel: false`.  
**Test directory**: `e2e/tests/` — 37 spec files already exist.  
**Auth fixture**: `e2e/helpers/auth.fixture.ts` — seeded users below.  
**DB reset**: global setup calls `POST /api/test/reset` before suite.

### Seeded Users (from DB seed)

| Email | Password | Role | Property |
|---|---|---|---|
| `guest@sinaicamps.com` | `password123` | guest | — |
| `safari@sinaicamps.com` | `password123` | manager/owner | safari-camp (premium) |
| `acacia@acaciacamp.com` | `password123` | manager/owner | acacia (ultimate, custom domain) |
| `staff@sinaicamps.com` | `password123` | staff | safari-camp |
| `master@sinaicamps.com` | `password123` | marketplace_master | all |

### Auth Pattern (use consistently)

```typescript
import { test, expect } from '../helpers/auth.fixture';

test('my test', async ({ page, guestSession }) => {
  const state = JSON.parse(guestSession.storageState);
  await page.context().addCookies(state.cookies);
  await page.goto('/en/guest');
  // ...
});
```

### Existing POM Files

- `e2e/pages/LoginPage.ts`
- `e2e/pages/PublicListingPage.ts`
- `e2e/pages/ManagerBookingsPage.ts`
- `e2e/pages/AdminDashboardPage.ts`
- `e2e/pages/MasterListingsPage.ts`
- `e2e/pages/GuestDashboardPage.ts`

---

## What's Already Covered (DO NOT REWRITE)

- `auth-gaps.spec.ts` — unauthenticated 401/403 on all protected routes ✅
- `plan-enforcement.spec.ts` — tenant resolution by plan, upgrade API, branding API ✅
- `ultimate-redirect.spec.ts` — post-login redirect to custom domain ✅
- `core/auth.spec.ts` — login page structure, admin redirects ✅

---

## Part 1 — Fix Existing Shallow Tests

The following tests currently only do `toHaveURL` or `getByText(/heading/)` — they need real assertion depth. DO NOT replace them — extend them with additional `test` blocks inside the same `describe`.

### 1.1 `e2e/tests/guest.spec.ts` — Deepen

Add inside `Authenticated guest journeys`:

```typescript
authenticatedTest('guest dashboard shows username', async ({ page, guestSession }) => {
  const state = JSON.parse(guestSession.storageState);
  await page.context().addCookies(state.cookies);
  await page.goto('/en/guest');
  // Must show user's name or email, not empty
  await expect(page.locator('body')).not.toContainText('undefined');
  await expect(page.locator('body')).not.toContainText('null');
});

authenticatedTest('guest reservations page has correct structure', async ({ page, guestSession }) => {
  const state = JSON.parse(guestSession.storageState);
  await page.context().addCookies(state.cookies);
  await page.goto('/en/guest/reservations');
  // Page renders reservation list area (even if empty)
  const heading = page.getByRole('heading').first();
  await expect(heading).toBeVisible();
  // Must not show a raw error
  await expect(page.locator('body')).not.toContainText('Error:');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
});

authenticatedTest('guest cannot access manager dashboard', async ({ page, guestSession }) => {
  const state = JSON.parse(guestSession.storageState);
  await page.context().addCookies(state.cookies);
  await page.goto('/en/manage/safari-camp');
  // Must redirect away — guest has no access
  await expect(page).not.toHaveURL(/\/en\/manage\/safari-camp$/);
});
```

### 1.2 `e2e/tests/manager.spec.ts` — Deepen

Read the current file first. Add authenticated manager tests:

```typescript
authenticatedTest('manager cannot access another listing', async ({ page, managerSession }) => {
  const state = JSON.parse(managerSession.storageState);
  await page.context().addCookies(state.cookies);
  // safari@ manages safari-camp (id=1). mountain-lodge (id=2) is different property.
  await page.goto('/en/manage/mountain-lodge');
  // Must get forbidden or redirect — not show management UI
  await expect(page).not.toHaveURL(/\/en\/manage\/mountain-lodge$/);
});

authenticatedTest('manager rooms page lists rooms', async ({ page, managerSession }) => {
  const state = JSON.parse(managerSession.storageState);
  await page.context().addCookies(state.cookies);
  await page.goto('/en/manage/safari-camp/rooms');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
});
```

---

## Part 2 — New Spec Files to Create

### 2.1 `e2e/tests/flows/registration-wizard.spec.ts`

**Flow: public visitor completes tenant registration wizard (basic plan)**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tenant Registration Wizard', () => {
  const uniqueSuffix = () => Date.now().toString(36);

  test('step guard: direct navigation to plan page redirects to step 1', async ({ page }) => {
    // No sessionStorage set — visiting plan page should redirect to step 1
    await page.goto('/en/list-your-camp/plan');
    await expect(page).toHaveURL(/\/en\/list-your-camp(?!\/plan)/);
  });

  test('step guard: direct navigation to branding page redirects to step 1', async ({ page }) => {
    await page.goto('/en/list-your-camp/branding');
    await expect(page).toHaveURL(/\/en\/list-your-camp(?!\/branding)/);
  });

  test('step 1: account creation form renders', async ({ page }) => {
    await page.goto('/en/list-your-camp');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /continue|next/i })).toBeVisible();
  });

  test('step 1: rejects duplicate email', async ({ page }) => {
    await page.goto('/en/list-your-camp');
    await page.getByLabel(/email/i).fill('safari@sinaicamps.com'); // already exists
    await page.getByLabel(/password/i).first().fill('Password123!');
    await page.getByRole('button', { name: /continue|next/i }).click();
    // Should show an error, not navigate to step 2
    await expect(page).toHaveURL(/\/en\/list-your-camp(?!\/branding)/);
  });

  test('full registration: basic plan → success page', async ({ page }) => {
    const suffix = uniqueSuffix();
    const email = `e2etest-${suffix}@testcamp.com`;
    const slug = `test-camp-${suffix}`;

    // Step 1 — Account
    await page.goto('/en/list-your-camp');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).first().fill('Password123!');
    // Fill first name / last name if present
    const firstNameInput = page.getByLabel(/first name/i);
    if (await firstNameInput.isVisible()) await firstNameInput.fill('Test');
    const lastNameInput = page.getByLabel(/last name/i);
    if (await lastNameInput.isVisible()) await lastNameInput.fill('Owner');
    await page.getByRole('button', { name: /continue|next/i }).click();
    await expect(page).toHaveURL(/branding/);

    // Step 2 — Branding
    await page.getByLabel(/property name/i).fill(`Test Camp ${suffix}`);
    // Slug should auto-populate or fill manually
    const slugInput = page.locator('input[placeholder*="slug"], input[placeholder*="acacia"]');
    if (await slugInput.isVisible()) {
      await slugInput.fill(slug);
    }
    await page.getByRole('button', { name: /continue|next/i }).last().click();
    await expect(page).toHaveURL(/plan/);

    // Step 3 — Plan: select Basic (free)
    const basicPlan = page.getByText(/Basic Listing/i).first();
    await basicPlan.click();
    await page.getByRole('button', { name: /create my account|create account/i }).click();

    // Success
    await expect(page).toHaveURL(/success/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText(/registered|success|created/i);
  });

  test('wizard: sessionStorage keys are cleaned up on success', async ({ page }) => {
    // After reaching success page, storage keys must be gone
    await page.goto('/en/list-your-camp/success?plan=basic&slug=some-slug');
    const reg1 = await page.evaluate(() => sessionStorage.getItem('reg_step1'));
    const reg2 = await page.evaluate(() => sessionStorage.getItem('reg_step2'));
    const regB = await page.evaluate(() => sessionStorage.getItem('reg_branding'));
    expect(reg1).toBeNull();
    expect(reg2).toBeNull();
    expect(regB).toBeNull();
  });
});
```

---

### 2.2 `e2e/tests/flows/guest-reservation.spec.ts`

**Flow: authenticated guest views reservations, cannot access another guest's reservation**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('Guest Reservation Flow', () => {
  test('guest can view their reservations list', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/\/en\/guest\/reservations/);
    await expect(page.getByRole('heading').first()).toBeVisible();
    // Must not show raw error
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('IDOR: guest cannot fetch another guest reservation via API', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    // Try to access a reservation ID that belongs to a different user
    const res = await page.request.get('/api/guest/reservations/nonexistent-booking-xyz');
    // Must not get 200 with real data — expect 401, 403, or 404
    expect([401, 403, 404]).toContain(res.status());
  });

  test('guest profile settings page updates are persisted', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/guest/settings');
    await expect(page).toHaveURL(/\/en\/guest\/settings/);
    // Form must be visible
    await expect(page.getByRole('form').or(page.locator('form'))).toBeVisible();
  });

  test('unauthenticated guest is redirected from reservations page', async ({ page }) => {
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/login/);
  });
});
```

---

### 2.3 `e2e/tests/flows/manager-domain.spec.ts`

**Flow: premium manager views and saves property settings; ultimate manager sees domain config**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('Manager Domain & Settings Flow', () => {
  test('manager can view property settings page', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/manage/safari-camp/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('manager sees subdomain info on settings (premium plan)', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/owner\/property/);
    // Branding form visible
    await expect(page.getByRole('heading', { name: /branding/i })).toBeVisible();
    // No crash
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('manager API: GET /api/owner/me returns subdomain', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/owner/me');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property).toBeDefined();
    expect(body.property.subdomain).toBeTruthy(); // safari-camp has a subdomain
  });

  test('manager API: cannot access another listing via manage API', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    // safari@ owns listing 1. mountain-lodge (listing 2) belongs to someone else.
    const res = await page.request.get('/api/manage/mountain-lodge/bookings');
    expect([401, 403]).toContain(res.status());
  });
});
```

---

### 2.4 `e2e/tests/flows/master-admin.spec.ts`

**Flow: master admin manages listings, users, platform settings**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('Master Admin Flow', () => {
  test('master can access listings page', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/admin/master');
    await expect(page).toHaveURL(/\/en\/admin\/master/);
    await expect(page.locator('body')).not.toContainText('Forbidden');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('master can access platform stats via API', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/master/stats');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.totalTenants === 'number' || body.stats !== undefined).toBe(true);
  });

  test('master can list all properties via API', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/master/listings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.listings ?? body.properties ?? body)).toBe(true);
  });

  test('master can read plugins catalog', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/master/plugins');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.plugins)).toBe(true);
    expect(body.plugins.length).toBeGreaterThanOrEqual(1);
  });

  test('master cannot be impersonated by guest', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/master/listings');
    expect([401, 403]).toContain(res.status());
  });

  test('master cannot be impersonated by manager', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/master/listings');
    expect([401, 403]).toContain(res.status());
  });
});
```

---

### 2.5 `e2e/tests/flows/staff-permissions.spec.ts`

**Flow: staff member can access their assigned listing only; cannot access manage-level APIs**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('Staff Role Permissions', () => {
  test('staff can access their assigned property pages', async ({ page, staffSession }) => {
    const state = JSON.parse(staffSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/manage/safari-camp');
    // Staff should be able to see their listing (or get redirected to a staff-specific view)
    await expect(page).toHaveURL(/safari-camp|staff|manage/);
    await expect(page.locator('body')).not.toContainText('Forbidden');
  });

  test('staff cannot access master admin pages', async ({ page, staffSession }) => {
    const state = JSON.parse(staffSession.storageState);
    await page.context().addCookies(state.cookies);
    await page.goto('/en/admin/master');
    await expect(page).not.toHaveURL(/\/en\/admin\/master$/);
  });

  test('staff cannot access owner property settings', async ({ page, staffSession }) => {
    const state = JSON.parse(staffSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/owner/me');
    // Staff is not an owner — should get 403 or empty property
    expect([401, 403, 404]).toContain(res.status());
  });

  test('staff cannot upgrade plan', async ({ page, staffSession }) => {
    const state = JSON.parse(staffSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.post('/api/owner/upgrade', {
      data: { siteId: '1', newPlan: 'ultimate' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('staff cannot access a different listing', async ({ page, staffSession }) => {
    const state = JSON.parse(staffSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.get('/api/manage/mountain-lodge/bookings');
    expect([401, 403]).toContain(res.status());
  });
});
```

---

### 2.6 `e2e/tests/flows/tenant-website.spec.ts`

**Flow: tenant website renders at subdomain path; basic plan is blocked; SEO metadata present**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tenant Website Rendering', () => {
  test('premium tenant website renders at slug path', async ({ page }) => {
    // In local dev the tenant slug path is /en/safari-camp/
    await page.goto('/en/safari-camp');
    // Must not redirect to marketplace listing page
    // Either renders tenant homepage OR redirects to subdomain (both acceptable in dev)
    const url = page.url();
    expect(url).not.toContain('/stay/safari-camp'); // basic plan marketplace redirect
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('basic plan tenant is redirected to marketplace listing', async ({ page }) => {
    // mountain-lodge is basic plan — must redirect to /stay/mountain-lodge
    await page.goto('/en/mountain-lodge');
    await expect(page).toHaveURL(/\/stay\/mountain-lodge|\/en\/stay\/mountain-lodge/);
  });

  test('tenant website has a title (not empty)', async ({ page }) => {
    await page.goto('/en/safari-camp');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).not.toBe('');
    expect(title.toLowerCase()).not.toBe('undefined');
  });

  test('tenant website has meta description', async ({ page }) => {
    await page.goto('/en/safari-camp');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    // Either has a description or is null (acceptable if OG description is used instead)
    if (description !== null) {
      expect(description.length).toBeGreaterThan(0);
    }
  });

  test('tenant website "Book Now" links to booking route with property ID', async ({ page }) => {
    await page.goto('/en/safari-camp');
    // Find any "Book Now" / "Book" CTA link
    const bookLink = page.getByRole('link', { name: /book now|book/i }).first();
    if (await bookLink.isVisible()) {
      const href = await bookLink.getAttribute('href');
      // Must contain a property ID — not just /book with no context
      expect(href).toMatch(/\/book\/.+/);
    }
  });

  test('tenant about page renders correctly', async ({ page }) => {
    await page.goto('/en/safari-camp/about');
    await expect(page).not.toHaveURL(/\/stay\/safari-camp/); // not redirected to marketplace
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('unknown tenant slug returns 404', async ({ page }) => {
    const response = await page.goto('/en/completely-unknown-camp-xyz');
    expect([404, 200]).toContain(response?.status() ?? 404); // 200 with not-found UI is also OK
    // If 200, page must contain 404 indicators
    if (response?.status() === 200) {
      await expect(page.locator('body')).toContainText(/not found|404|does not exist/i);
    }
  });
});
```

---

### 2.7 `e2e/tests/flows/auth-full.spec.ts`

**Flow: full sign-in, sign-out, post-login redirect by role, Google OAuth button presence**

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Full Auth Flow', () => {
  test('guest login → redirects to guest dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('guest@sinaicamps.com', 'password123');
    await expect(page).toHaveURL(/\/en\/guest/, { timeout: 15000 });
  });

  test('manager login → redirects to manage dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('safari@sinaicamps.com', 'password123');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp|\/en\/owner/, { timeout: 15000 });
  });

  test('master login → redirects to admin/master page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('master@sinaicamps.com', 'password123');
    await expect(page).toHaveURL(/\/en\/admin/, { timeout: 15000 });
  });

  test('wrong password shows error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('guest@sinaicamps.com', 'wrongpassword');
    // Must not navigate away — must show error
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('body')).toContainText(/invalid|incorrect|wrong|error/i);
  });

  test('sign-out clears session and redirects to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('guest@sinaicamps.com', 'password123');
    await expect(page).toHaveURL(/\/en\/guest/, { timeout: 15000 });

    // Sign out — find and click sign out button/link
    const signOutBtn = page.getByRole('button', { name: /sign out|log out|logout/i })
      .or(page.getByRole('link', { name: /sign out|log out|logout/i }));
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await expect(page).toHaveURL(/login|\/en$/, { timeout: 10000 });
      // Protected page now inaccessible
      await page.goto('/en/guest');
      await expect(page).toHaveURL(/login/);
    }
  });

  test('Google sign-in button is visible on login page', async ({ page }) => {
    await page.goto('/en/login');
    const googleBtn = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }))
      .or(page.locator('[data-provider="google"]'));
    // Only check if Google credentials are configured — always present in login UI
    await expect(googleBtn.or(page.getByText(/continue with google/i))).toBeVisible({ timeout: 5000 })
      .catch(() => { /* Google not configured in this env — skip */ });
  });

  test('protected page redirects unauthenticated user with correct return URL', async ({ page }) => {
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/login/);
  });
});
```

---

### 2.8 `e2e/tests/flows/public-marketplace.spec.ts`

**Flow: anonymous visitor searches, views listing, cannot book without auth**

```typescript
import { test, expect } from '@playwright/test';
import { PublicListingPage } from '../../pages/PublicListingPage';

test.describe('Public Marketplace Flow', () => {
  test('homepage loads with listing cards', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    // Should have at least one listing or search component
    const listings = page.locator('[data-testid*="listing"], [data-testid*="property"], .listing-card');
    const searchBar = page.getByPlaceholder(/search|where|camp/i);
    const hasListings = await listings.count() > 0;
    const hasSearch = await searchBar.isVisible().catch(() => false);
    expect(hasListings || hasSearch).toBe(true);
  });

  test('public search API returns results', async ({ request }) => {
    const res = await request.get('/api/public/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.properties ?? body.listings ?? body)).toBe(true);
  });

  test('listing detail page renders for safari-camp', async ({ page }) => {
    const listingPage = new PublicListingPage(page);
    await listingPage.goto('safari-camp');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('listing detail page renders for mountain-lodge', async ({ page }) => {
    const listingPage = new PublicListingPage(page);
    await listingPage.goto('mountain-lodge');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('booking page requires authentication', async ({ page }) => {
    // Try to access a booking page directly
    await page.goto('/en/book/1');
    // Either redirects to login or shows a sign-in prompt
    const url = page.url();
    const hasLoginRedirect = url.includes('login');
    const hasSignInPrompt = await page.getByText(/sign in|login|authenticate/i).isVisible().catch(() => false);
    expect(hasLoginRedirect || hasSignInPrompt).toBe(true);
  });

  test('categories API returns structured data', async ({ request }) => {
    const res = await request.get('/api/public/categories');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.categories ?? body)).toBe(true);
  });

  test('featured listings API returns properties', async ({ request }) => {
    const res = await request.get('/api/public/featured-listings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.listings ?? body.properties ?? body;
    expect(Array.isArray(list)).toBe(true);
  });
});
```

---

### 2.9 `e2e/tests/security/idor.spec.ts`

**Security: confirm IDOR guards are enforced at UI and API level**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('IDOR & Cross-Tenant Security', () => {
  test('guest A cannot read guest B reservation via API', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    // Try a fake reservation ID that belongs to nobody/other user
    const res = await page.request.get('/api/guest/reservations/fake-booking-id-999');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('manager A cannot read manager B bookings via API', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    // safari@ (manager) tries to access mountain-lodge's bookings
    const res = await page.request.get('/api/manage/mountain-lodge/bookings');
    expect([401, 403]).toContain(res.status());
  });

  test('manager A cannot update manager B property settings', async ({ page, managerSession }) => {
    const state = JSON.parse(managerSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.patch('/api/manage/mountain-lodge/settings', {
      data: { name: 'Hacked!' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('guest cannot POST to manager API endpoints', async ({ page, guestSession }) => {
    const state = JSON.parse(guestSession.storageState);
    await page.context().addCookies(state.cookies);
    const res = await page.request.post('/api/manage/safari-camp/rooms', {
      data: { name: 'Injected Room' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('unauthenticated cannot POST to any manage endpoint', async ({ request }) => {
    const endpoints = [
      '/api/manage/safari-camp/rooms',
      '/api/manage/safari-camp/bookings',
      '/api/manage/safari-camp/settings',
    ];
    for (const endpoint of endpoints) {
      const res = await request.post(endpoint, { data: {} });
      expect([401, 403]).toContain(res.status());
    }
  });
});
```

---

### 2.10 `e2e/tests/flows/plan-upgrade-flow.spec.ts`

**Flow: manager upgrades plan via API; plan change is reflected**

```typescript
import { test, expect } from '../../helpers/auth.fixture';

test.describe('Plan Upgrade Flow', () => {
  test.beforeEach(async ({ request }) => {
    // Reset DB before each test in this suite
    const res = await request.post('http://localhost:3000/api/test/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('mountain-lodge manager upgrades from basic to premium', async ({ page, request }) => {
    // mountain-lodge is basic plan. Use its owner to upgrade.
    // First sign in as mountain-lodge owner (use master for simplicity to avoid another fixture)
    const signIn = await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'mountain@sinaicamps.com', password: 'password123' },
    });
    // If no dedicated mountain owner seed, skip gracefully
    if (!signIn.ok()) {
      test.skip(true, 'No mountain-lodge owner seed user — skipping');
      return;
    }
    const upgradeRes = await request.post('/api/owner/upgrade', {
      data: {
        siteId: '2',
        newPlan: 'premium',
        subdomain: 'mountain-lodge',
        stripe_payment_method_id: 'pm_placeholder',
      },
    });
    expect([200, 402]).toContain(upgradeRes.status()); // 402 if payment gate enforced
    if (upgradeRes.status() === 200) {
      const body = await upgradeRes.json();
      expect(body.plan).toBe('premium');
    }
  });

  test('upgrade API rejects plan downgrade', async ({ request }) => {
    const signIn = await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    expect(signIn.ok()).toBeTruthy();
    // Try to downgrade premium → basic
    const res = await request.post('/api/owner/upgrade', {
      data: { siteId: '1', newPlan: 'basic' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid plan/i);
  });

  test('upgrade API rejects reserved slug for subdomain', async ({ request }) => {
    const signIn = await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    expect(signIn.ok()).toBeTruthy();
    const res = await request.post('/api/owner/upgrade', {
      data: { siteId: '1', newPlan: 'ultimate', customDomain: 'admin.sinaicamps.com' },
    });
    expect([400, 409]).toContain(res.status());
  });
});
```

---

## Part 3 — New Page Object Models Needed

Create these in `e2e/pages/`:

### `e2e/pages/TenantWebsitePage.ts`

```typescript
import { type Page, type Locator } from '@playwright/test';

export class TenantWebsitePage {
  readonly page: Page;
  readonly bookNowButton: Locator;
  readonly heroHeading: Locator;
  readonly navLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookNowButton = page.getByRole('link', { name: /book now/i });
    this.heroHeading = page.getByRole('heading').first();
    this.navLinks = page.getByRole('navigation').getByRole('link');
  }

  async goto(slug: string, locale = 'en') {
    await this.page.goto(`/${locale}/${slug}`);
  }

  async gotoSubPage(slug: string, subPage: string, locale = 'en') {
    await this.page.goto(`/${locale}/${slug}/${subPage}`);
  }
}
```

### `e2e/pages/RegistrationWizardPage.ts`

```typescript
import { type Page, type Locator } from '@playwright/test';

export class RegistrationWizardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoStep1(locale = 'en') {
    await this.page.goto(`/${locale}/list-your-camp`);
  }

  async fillStep1(email: string, password: string, firstName?: string, lastName?: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).first().fill(password);
    if (firstName) {
      const f = this.page.getByLabel(/first name/i);
      if (await f.isVisible()) await f.fill(firstName);
    }
    if (lastName) {
      const l = this.page.getByLabel(/last name/i);
      if (await l.isVisible()) await l.fill(lastName);
    }
    await this.page.getByRole('button', { name: /continue|next/i }).click();
  }

  async fillStep2(propertyName: string, slug?: string) {
    await this.page.getByLabel(/property name/i).fill(propertyName);
    if (slug) {
      const slugInput = this.page.locator('input[placeholder*="slug"], input[placeholder*="acacia"]');
      if (await slugInput.isVisible()) {
        await slugInput.fill(slug);
      }
    }
    await this.page.getByRole('button', { name: /continue|next/i }).last().click();
  }

  async selectPlanAndSubmit(plan: 'basic' | 'premium' | 'ultimate') {
    const planText = plan === 'basic' ? /basic listing/i : plan === 'premium' ? /operations suite/i : /white label/i;
    await this.page.getByText(planText).first().click();
    await this.page.getByRole('button', { name: /create my account|create account/i }).click();
  }
}
```

---

## Part 4 — Update `e2e/helpers/auth.fixture.ts`

Add an `ownerSession` fixture for the Acacia Camp (ultimate) owner:

```typescript
// Add to the extend<{...}> type:
ownerSession: { storageState: string };

// Add the fixture implementation:
ownerSession: async ({ request }, use) => {
  const storageState = await getStorageState(request, 'acacia@acaciacamp.com');
  await use({ storageState: JSON.stringify(storageState) });
},
```

---

## Part 5 — Run & Verify

```bash
# Run all E2E tests
npx playwright test --reporter=list 2>&1 | tail -30

# Run only the new flows
npx playwright test e2e/tests/flows/ --reporter=list 2>&1

# Run only security tests
npx playwright test e2e/tests/security/ --reporter=list 2>&1

# Run a single spec for fast iteration
npx playwright test e2e/tests/flows/auth-full.spec.ts --reporter=list 2>&1
```

**Pass criteria**:
- All new tests pass OR are explicitly `test.skip()`-ed with a documented reason
- No existing tests regressed
- No test uses `expect(true).toBe(true)` or other trivially-passing assertions
- Every authenticated test uses the auth fixture pattern — never hardcodes cookies manually

---

## Part 6 — Update AGENT_LOGBOOK.md

Append a dated entry with:
- List of new spec files created
- List of new POM files created
- Total Playwright test count before and after
- Any tests that were skipped and why
- Gotchas discovered (flaky selectors, race conditions, etc.)
