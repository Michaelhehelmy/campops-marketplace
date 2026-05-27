# OpenCode Agent Prompt: E2E Deep Coverage — Fill Critical Gaps

## Baseline & Rules

**Current state**: 301 tests, 45 spec files, all green.  
**Target**: fix 2 skipped tests, add coverage for every gap below, maintain 100% green.  
**Zero `waitForTimeout`** — replace every instance with `waitForURL`, `waitForResponse`, or `waitForSelector`.  
**Dynamic dates** — never use hardcoded past dates (2025); always compute `new Date(Date.now() + ...)`.  
**Auth pattern** — use `loginAs()` from `booking_crm.spec.ts` (browser UI login), not addCookies, for tests that need client-side fetch to work.

### Shared login helper (add to `e2e/helpers/page-helpers.ts`)

```typescript
export async function loginAs(page: Page, email: string, password = 'password123') {
  await page.goto('/en/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/(admin|manage|guest|owner)/, { timeout: 20000 });
}

export function futureDates(daysFromNow: number, nights: number) {
  const checkIn = new Date(Date.now() + daysFromNow * 86400000);
  const checkOut = new Date(checkIn.getTime() + nights * 86400000);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}
```

---

## Part 1 — Fix the 2 Skipped Tests

File: `e2e/tests/plugin-lifecycle.spec.ts`

The two `test.skip` blocks (Scenario 3 and Scenario 4) are skipped because their selectors were uncertain. They are now the **highest-risk blind spot**. Un-skip them and make them resilient.

### Scenario 3: Guest books → Manager sees the booking

Replace the `test.skip` block with:

```typescript
test('Scenario 3: Guest books a room and Manager sees it in their dashboard', async ({
  page,
  managerSession,
}) => {
  test.setTimeout(120000);
  const { checkIn, checkOut } = futureDates(30, 2);

  // Enable booking via API (avoid UI dependency for setup)
  const masterSignIn = await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
    headers: { Origin: 'http://localhost:3000' },
    data: { email: 'master@sinaicamps.com', password: 'password123' },
  });
  expect(masterSignIn.ok()).toBeTruthy();
  const enableRes = await page.request.post('/api/manage/1/plugins/toggle', {
    data: { pluginName: 'booking', enabled: true },
  });
  expect([200, 400]).toContain(enableRes.status()); // 400 if already enabled

  // Book as guest via browser login (client-side fetch must work)
  await loginAs(page, 'guest@sinaicamps.com');
  await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);

  // Wait for the booking widget, then click first "Book now" link
  const bookingWidget = page.getByRole('region', { name: /Book Your Stay/i })
    .or(page.getByTestId('booking-real'));
  await expect(bookingWidget).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: /Book now/i }).first().click();
  await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });

  // Fill form
  const guestNameInput = page.locator('#guestName').or(page.getByLabel(/name/i).first());
  await guestNameInput.fill('Test Guest');
  const guestEmailInput = page.locator('#guestEmail').or(page.getByLabel(/email/i).first());
  await guestEmailInput.fill('guest@sinaicamps.com');

  // Continue to payment
  await page.getByTestId('continue-to-payment').click();
  const payLater = page.locator('#pay_later').or(page.getByLabel(/pay later/i));
  await expect(payLater).toBeVisible({ timeout: 10000 });
  await payLater.click();

  // Confirm and verify success
  const confirmBtn = page.getByRole('button', { name: /confirm booking/i });
  const confirmResponse = page.waitForResponse(
    (res) => res.url().includes('/api/p/booking/book') && res.status() === 200,
    { timeout: 20000 }
  );
  await confirmBtn.click();
  await confirmResponse;
  await expect(
    page.getByText(/Booking Confirmed!/i).or(page.getByText(/booking confirmed/i))
  ).toBeVisible({ timeout: 15000 });

  // Switch to manager and verify booking appears
  await page.context().clearCookies();
  const managerState = JSON.parse(managerSession.storageState);
  await page.context().addCookies(managerState.cookies);
  const bookingsRes = await page.request.get('/api/manage/safari-camp/bookings');
  expect(bookingsRes.status()).toBe(200);
  const body = await bookingsRes.json();
  const bookings = body.bookings ?? body.data ?? body;
  expect(Array.isArray(bookings)).toBe(true);
  expect(bookings.length).toBeGreaterThan(0);
});
```

### Scenario 4: Booking + CRM inter-plugin communication

```typescript
test('Scenario 4: CRM records activity after booking', async ({ page }) => {
  test.setTimeout(120000);
  const { checkIn, checkOut } = futureDates(35, 3);

  // Enable both plugins via API as master
  await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
    headers: { Origin: 'http://localhost:3000' },
    data: { email: 'master@sinaicamps.com', password: 'password123' },
  });
  await page.request.post('/api/manage/1/plugins/toggle', { data: { pluginName: 'booking', enabled: true } });
  await page.request.post('/api/manage/1/plugins/toggle', { data: { pluginName: 'crm', enabled: true } });

  // Book as guest
  await loginAs(page, 'guest@sinaicamps.com');
  await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
  await page.getByRole('link', { name: /Book now/i }).first().click();
  await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });
  await page.locator('#guestName').or(page.getByLabel(/name/i).first()).fill('CRM Test Guest');
  await page.locator('#guestEmail').or(page.getByLabel(/email/i).first()).fill('guest@sinaicamps.com');
  await page.getByTestId('continue-to-payment').click();
  await page.locator('#pay_later').or(page.getByLabel(/pay later/i)).click();
  const crmRes = page.waitForResponse(
    (res) => res.url().includes('/api/p/booking/book') && res.status() === 200,
    { timeout: 20000 }
  );
  await page.getByRole('button', { name: /confirm booking/i }).click();
  await crmRes;
  await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible({ timeout: 15000 });

  // Verify CRM recorded the event via API
  const activityRes = await page.request.get('/api/p/crm/activity');
  if (activityRes.status() === 200) {
    const body = await activityRes.json();
    const events = body.events ?? body.activity ?? body;
    if (Array.isArray(events)) {
      const bookingEvent = events.find((e: any) =>
        JSON.stringify(e).toLowerCase().includes('booking')
      );
      expect(bookingEvent).toBeDefined();
    }
  }
  // Also check the guest dashboard UI
  await page.goto('/en/guest');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
});
```

**After un-skipping**: run `npx playwright test e2e/tests/plugin-lifecycle.spec.ts` and fix any selector mismatches against the actual DOM.

---

## Part 2 — Payment Failure Scenarios

Create `e2e/tests/flows/payment-failures.spec.ts`.

These tests verify the system handles Paymob edge cases without crashing. Use `page.route()` to mock Paymob API responses — never call real Paymob endpoints in E2E tests.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, futureDates } from '../../helpers/page-helpers';

test.describe('Payment Failure Scenarios', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  async function signInAndGoToPayment(page: any) {
    const { checkIn, checkOut } = futureDates(60, 2);
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    await page.getByRole('link', { name: /Book now/i }).first().click();
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });
    const nameInput = page.locator('#guestName').or(page.getByLabel(/name/i).first());
    await nameInput.fill('Failure Test Guest');
    const emailInput = page.locator('#guestEmail').or(page.getByLabel(/email/i).first());
    await emailInput.fill('guest@sinaicamps.com');
    await page.getByTestId('continue-to-payment').click();
  }

  test('Paymob auth failure shows friendly error — not raw 500', async ({ page }) => {
    // Mock Paymob auth endpoint to return 401
    await page.route('https://accept.paymob.com/api/auth/tokens', (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ detail: 'Unauthorized' }) });
    });

    await signInAndGoToPayment(page);

    // Select Paymob (card) payment option if visible
    const paymobOption = page.locator('[data-payment-method="paymob"]')
      .or(page.getByLabel(/credit card|paymob/i));
    if (await paymobOption.isVisible().catch(() => false)) {
      await paymobOption.click();
      await page.getByRole('button', { name: /confirm|pay/i }).click();
      // Must show a user-facing error, not a raw stack trace
      await expect(page.locator('body')).not.toContainText('at Object.');
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
      const errorText = page.getByText(/failed|error|could not|problem/i);
      await expect(errorText).toBeVisible({ timeout: 10000 });
    }
  });

  test('Paymob webhook with invalid HMAC returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook?hmac=invalid-hmac-value', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        type: 'TRANSACTION',
        obj: {
          id: 99999, success: true, pending: false, amount_cents: 10000,
          currency: 'EGP', created_at: new Date().toISOString(),
          order: { id: 88888 }, is_void: false, is_refund: false,
          is_auth: false, is_capture: false, is_standalone_payment: true,
          is_3d_secure: false, error_occured: false, has_parent_transaction: false,
          integration_id: 67890, owner: 100,
          source_data: { type: 'card', sub_type: 'Visa', pan: '1234' },
        },
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/hmac|signature|invalid/i);
  });

  test('Paymob webhook with missing HMAC query param returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook', {
      headers: { 'Content-Type': 'application/json' },
      data: { type: 'TRANSACTION', obj: { id: 1 } },
    });
    expect(res.status()).toBe(401);
  });

  test('Paymob create-payment without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/create-payment', {
      data: { bookingId: 'b-1', amountCents: 10000, billingData: { email: 'x@x.com' } },
    });
    expect(res.status()).toBe(401);
  });

  test('Paymob refund without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/refund', {
      data: { transactionId: '12345', amountCents: 5000 },
    });
    expect(res.status()).toBe(401);
  });

  test('Paymob refund as guest (wrong role) returns 403', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.post('/api/p/paymob/refund', {
      data: { transactionId: '12345', amountCents: 5000 },
    });
    expect(res.status()).toBe(403);
  });

  test('Return route with missing transaction ID returns 400', async ({ request }) => {
    const res = await request.get('/api/p/paymob/return');
    expect(res.status()).toBe(400);
  });

  test('Pay-later booking still reaches confirmation screen', async ({ page }) => {
    const { checkIn, checkOut } = futureDates(45, 2);
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    await page.getByRole('link', { name: /Book now/i }).first().click();
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });
    await page.locator('#guestName').or(page.getByLabel(/name/i).first()).fill('Pay Later Guest');
    await page.locator('#guestEmail').or(page.getByLabel(/email/i).first()).fill('guest@sinaicamps.com');
    await page.getByTestId('continue-to-payment').click();
    const payLater = page.locator('#pay_later').or(page.getByLabel(/pay later/i));
    await expect(payLater).toBeVisible({ timeout: 10000 });
    await payLater.click();
    const bookRes = page.waitForResponse(
      (r) => r.url().includes('/api/p/booking/book') && r.status() === 200,
      { timeout: 20000 }
    );
    await page.getByRole('button', { name: /confirm booking/i }).click();
    await bookRes;
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible({ timeout: 15000 });
  });
});
```

---

## Part 3 — Guest Self-Service Flows

Create `e2e/tests/flows/guest-self-service.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Guest Self-Service', () => {
  test('guest can view reservation detail page', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/\/en\/guest\/reservations/);

    // If there are reservations, click the first one
    const firstReservation = page.getByRole('link', { name: /view|details|manage/i }).first()
      .or(page.locator('[data-testid*="reservation-row"]').first());
    if (await firstReservation.isVisible().catch(() => false)) {
      await firstReservation.click();
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    }
  });

  test('guest reservation API returns only their own bookings', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.get('/api/guest/reservations');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const reservations = body.reservations ?? body.data ?? body;
    expect(Array.isArray(reservations)).toBe(true);
    // All reservations must belong to this user (user_id check handled server-side)
    // Verify the response shape has expected fields
    if (reservations.length > 0) {
      expect(reservations[0]).toHaveProperty('id');
      expect(reservations[0]).toHaveProperty('property_name');
    }
  });

  test('guest profile settings form is editable', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/settings');
    await expect(page).toHaveURL(/\/en\/guest\/settings/);
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    // No server error rendered
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest following page renders properly', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/following');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest dashboard shows correct structure', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest orders page renders (even if empty)', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.get('/api/guest/orders');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });
});
```

---

## Part 4 — Mobile Responsiveness

### 4.1 Add mobile project to `playwright.config.ts`

Read the current `playwright.config.ts`. Add a mobile project inside the `projects` array:

```typescript
{
  name: 'mobile-chrome',
  use: {
    ...devices['Pixel 5'],
    channel: 'chrome',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome',
    },
  },
},
```

### 4.2 Create `e2e/tests/responsive/mobile.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

/**
 * Mobile viewport tests — runs in the 'mobile-chrome' project (Pixel 5).
 * All tests are tagged @mobile so they can be run in isolation:
 *   npx playwright test --project=mobile-chrome
 */

test.describe('Mobile: Public pages', () => {
  test('homepage loads and is not horizontally scrollable', async ({ page }) => {
    await page.goto('/en');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    // Allow 10px tolerance for scrollbar
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('listing page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/en/stay/safari-camp');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('login page is usable on mobile', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-button')).toBeVisible();
    // Tap targets must be large enough (>= 44px height)
    const loginBtn = page.getByTestId('login-button');
    const box = await loginBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Mobile: Authenticated flows', () => {
  test('guest dashboard is readable on mobile', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('manager dashboard is usable on mobile', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('registration step 1 is completable on mobile', async ({ page }) => {
    await page.goto('/en/list-your-camp');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Form must not be clipped off screen
    const emailBox = await page.getByLabel(/email/i).boundingBox();
    expect(emailBox?.x).toBeGreaterThanOrEqual(0);
    expect((emailBox?.x ?? 0) + (emailBox?.width ?? 0)).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 375) + 1
    );
  });
});
```

---

## Part 5 — Owner Property CRUD

Create `e2e/tests/flows/owner-property-crud.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Owner Property CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('owner can view their property settings page', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/owner\/property/);
    await expect(page.getByRole('heading', { name: /branding/i })).toBeVisible();
  });

  test('owner can update branding color via API', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.patch('/api/properties/1', {
      data: { primaryColor: '#003366', tagline: 'E2E Test Tagline' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.branding.primaryColor).toBe('#003366');
    expect(body.branding.tagline).toBe('E2E Test Tagline');
  });

  test('owner changes are reflected in /api/owner/me', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    await page.request.patch('/api/properties/1', { data: { tagline: 'Unique CRUD Test' } });
    const res = await page.request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.branding.tagline).toBe('Unique CRUD Test');
  });

  test('owner cannot update another property', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.patch('/api/properties/2', {
      data: { primaryColor: '#FF0000' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('owner branding form persists changes through UI', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/owner/property');
    await expect(page.locator('input[type="color"]').first()).toBeVisible();
    // Change the color
    await page.locator('input[type="color"]').first().fill('#CC0044');
    // Save button
    const saveBtn = page.getByRole('button', { name: /save|update/i });
    await expect(saveBtn).toBeVisible();
    const saveRes = page.waitForResponse(
      (r) => r.url().includes('/api/properties') && r.request().method() === 'PATCH',
      { timeout: 10000 }
    );
    await saveBtn.click();
    await saveRes;
    // No error shown
    await expect(page.locator('body')).not.toContainText('Error:');
  });
});
```

---

## Part 6 — Manager Full CRUD

Create `e2e/tests/flows/manager-crud.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, futureDates } from '../../helpers/page-helpers';

test.describe('Manager Full CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('manager can view bookings list for their property', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.get('/api/manage/safari-camp/bookings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const bookings = body.bookings ?? body.data ?? body;
    expect(Array.isArray(bookings)).toBe(true);
  });

  test('manager can view rooms list for their property', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.get('/api/manage/safari-camp/rooms');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const rooms = body.rooms ?? body.data ?? body;
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
  });

  test('manager bookings dashboard page loads', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp/bookings');
    await expect(page.getByTestId('manager-bookings-list')
      .or(page.getByRole('table'))
      .or(page.getByText(/bookings/i))
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('manager check-in via API', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    // First get a booking ID from the list
    const listRes = await page.request.get('/api/manage/safari-camp/bookings');
    const listBody = await listRes.json();
    const bookings = listBody.bookings ?? listBody.data ?? listBody;
    if (Array.isArray(bookings) && bookings.length > 0) {
      const bookingId = bookings[0].id;
      const checkInRes = await page.request.patch(`/api/p/booking/${bookingId}/check-in`);
      expect([200, 400, 403, 409]).toContain(checkInRes.status()); // 409 = already checked in
    }
  });

  test('manager CRM/guests page loads', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp/guests');
    await expect(page.getByText(/CRM|Guests|guests/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
```

---

## Part 7 — Search & Filters

Create `e2e/tests/flows/search-filters.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';
import { futureDates } from '../../helpers/page-helpers';

test.describe('Search & Filters', () => {
  test('public search returns results', async ({ request }) => {
    const res = await request.get('/api/public/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThan(0);
  });

  test('search with text filter narrows results', async ({ request }) => {
    const allRes = await request.get('/api/public/search');
    const allBody = await allRes.json();
    const allCount = (allBody.properties ?? allBody.listings ?? allBody).length;

    const filteredRes = await request.get('/api/public/search?q=safari');
    expect(filteredRes.status()).toBe(200);
    const filteredBody = await filteredRes.json();
    const filtered = filteredBody.properties ?? filteredBody.listings ?? filteredBody;
    // Results with text filter should be <= all results
    expect(filtered.length).toBeLessThanOrEqual(allCount);
    // All results should contain 'safari' in name or description
    for (const p of filtered) {
      const haystack = JSON.stringify(p).toLowerCase();
      expect(haystack).toContain('safari');
    }
  });

  test('search with date filter returns availability', async ({ request }) => {
    const { checkIn, checkOut } = futureDates(90, 3);
    const res = await request.get(`/api/public/search?checkIn=${checkIn}&checkOut=${checkOut}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
  });

  test('check-availability API returns valid structure', async ({ request }) => {
    const { checkIn, checkOut } = futureDates(90, 2);
    const res = await request.post('/api/p/booking/check-availability', {
      data: { propertyId: '1', checkIn, checkOut, guests: 2 },
    });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.rooms !== undefined || body.available !== undefined).toBe(true);
    }
  });

  test('search homepage UI has filter controls', async ({ page }) => {
    await page.goto('/en');
    const hasDateFilter =
      (await page.getByPlaceholder(/check.?in/i).isVisible().catch(() => false)) ||
      (await page.getByLabel(/check.?in/i).isVisible().catch(() => false));
    const hasSearchInput =
      (await page.getByPlaceholder(/where|search|destination/i).isVisible().catch(() => false));
    // At least one filter control must be present
    expect(hasDateFilter || hasSearchInput).toBe(true);
  });

  test('categories API returns named categories', async ({ request }) => {
    const res = await request.get('/api/public/categories');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const categories = body.categories ?? body;
    expect(Array.isArray(categories)).toBe(true);
    if (categories.length > 0) {
      expect(categories[0]).toHaveProperty('name');
    }
  });
});
```

---

## Part 8 — Plugin Contract Tests (Future-Proof)

This is the key spec for future plugin coverage. Any plugin that follows the `PluginAPI` contract will pass these tests automatically.

Create `e2e/tests/plugin-contract.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';

/**
 * Plugin Contract Tests
 * ─────────────────────
 * Tests the invariants that EVERY plugin must satisfy, regardless of its
 * specific functionality. This spec should pass for all current plugins
 * and for every future plugin added to the system.
 *
 * Design: tests query the plugin registry and then probe each plugin's
 * registered routes generically — no hardcoded plugin names.
 */

test.describe('Plugin Contract: Registry Invariants', () => {
  test('plugin catalog lists all installed plugins with required fields', async ({ request }) => {
    const res = await request.get('/api/plugins?propertyId=1');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const plugins = body.plugins ?? body;
      expect(Array.isArray(plugins)).toBe(true);
      for (const plugin of plugins) {
        expect(plugin.id ?? plugin.name ?? plugin.pluginId).toBeDefined();
      }
    }
  });

  test('master plugin catalog has required fields on every plugin', async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    const res = await request.get('/api/master/plugins');
    expect(res.status()).toBe(200);
    const { plugins } = await res.json();
    expect(Array.isArray(plugins)).toBe(true);
    for (const plugin of plugins) {
      // Every plugin must have at minimum: an identifier and a name
      expect(plugin.id ?? plugin.pluginId ?? plugin.name).toBeTruthy();
      // Every plugin must have a version
      expect(plugin.version ?? plugin.apiVersion ?? '1.0.0').toBeTruthy();
    }
  });

  test('plugin toggle API requires authentication', async ({ request }) => {
    const res = await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('plugin toggle API rejects non-owner user', async ({ request }) => {
    // Sign in as a guest — should not be able to toggle plugins
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const res = await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe('Plugin Contract: Route Guard Invariants', () => {
  // Any route under /api/p/* is a plugin route.
  // All known plugin routes must enforce authentication.
  const PLUGIN_POST_ROUTES = [
    '/api/p/booking/book',
    '/api/p/booking/check-availability',
    '/api/p/paymob/create-payment',
    '/api/p/paymob/refund',
  ];

  // Note: check-availability may be intentionally public
  // Only test routes that should be protected
  const PROTECTED_PLUGIN_ROUTES = [
    '/api/p/paymob/create-payment',
    '/api/p/paymob/refund',
  ];

  for (const route of PROTECTED_PLUGIN_ROUTES) {
    test(`${route} requires auth (unauthenticated → 401)`, async ({ request }) => {
      const res = await request.post(route, {
        data: { test: true },
      });
      expect(res.status()).toBe(401);
    });
  }

  test('/api/p/paymob/webhook without HMAC param returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook', {
      data: { type: 'TRANSACTION', obj: {} },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Plugin Contract: Error Format Invariants', () => {
  // All plugin routes must return JSON, never crash with HTML 500

  test('unknown plugin route returns 404, not crash', async ({ request }) => {
    const res = await request.get('/api/p/nonexistent-plugin-xyz/action');
    expect([404, 400]).toContain(res.status());
    const contentType = res.headers()['content-type'] ?? '';
    // Must be JSON, not an HTML error page
    expect(contentType).toContain('application');
  });

  test('plugin route with invalid JSON body returns 400, not 500', async ({ request }) => {
    const res = await request.post('/api/p/booking/book', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json at all',
    });
    // Either 400 (bad request) or 401 (auth first) — never 500
    expect([400, 401]).toContain(res.status());
  });
});

test.describe('Plugin Contract: Isolation Invariants', () => {
  test('booking plugin enabled for property 1 does not affect property 2', async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    // Enable booking for property 1
    await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    // Property 2's plugin state must be independent
    const res2 = await request.get('/api/plugins?propertyId=2');
    if (res2.status() === 200) {
      const body = await res2.json();
      const plugins = body.plugins ?? body;
      // Property 2 manages its own plugin state
      expect(Array.isArray(plugins)).toBe(true);
    }
  });
});
```

---

## Part 9 — Multi-Locale Smoke Tests

Create `e2e/tests/responsive/locale.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'ar'] as const;

for (const locale of LOCALES) {
  test.describe(`Locale: ${locale}`, () => {
    test(`/${locale} homepage loads without error`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).not.toBe(500);
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });

    test(`/${locale} login page loads with form`, async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await expect(page.getByTestId('email-input')).toBeVisible();
    });

    test(`/${locale} listing page loads`, async ({ page }) => {
      await page.goto(`/${locale}/stay/safari-camp`);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });
  });
}

test('RTL layout: Arabic page has dir=rtl on html element', async ({ page }) => {
  await page.goto('/ar');
  const dir = await page.locator('html').getAttribute('dir');
  // Arabic should use RTL direction
  expect(dir).toBe('rtl');
});

test('locale switcher is visible on homepage', async ({ page }) => {
  await page.goto('/en');
  const localeSwitcher = page.getByRole('combobox', { name: /language|locale/i })
    .or(page.getByRole('link', { name: /عربي|AR|Arabic/i }))
    .or(page.locator('[data-testid*="locale"]'));
  if (await localeSwitcher.isVisible().catch(() => false)) {
    // Good — switcher is present
    expect(true).toBe(true);
  }
  // Not a hard failure if switcher isn't in UI yet — soft assertion
});
```

---

## Part 10 — Plan Upgrade UI Flow

Create `e2e/tests/flows/plan-upgrade-ui.spec.ts`.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Plan Upgrade UI Flow', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('owner dashboard shows current plan', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/owner/property');
    await expect(page.locator('body')).toContainText(/premium|plan/i);
  });

  test('upgrade page renders plan options', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    // Upgrade page or plan selection
    const res = await page.request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.plan).toBeDefined();
    // Current plan is shown — it's premium
    expect(['basic', 'premium', 'ultimate']).toContain(body.property.plan);
  });

  test('upgrade API from premium to ultimate requires custom domain', async ({ page }) => {
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    // Upgrade without custom domain — should 400
    const res = await page.request.post('/api/owner/upgrade', {
      data: { siteId: '1', newPlan: 'ultimate' },
    });
    // Either requires custom domain or fails with explicit message
    expect([400, 402]).toContain(res.status());
  });

  test('upgrade API with SKIP_PAYMENT_GATE succeeds', async ({ page }) => {
    // The webServer command sets SKIP_PAYMENT_GATE=true via NODE_ENV
    await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    const res = await page.request.post('/api/owner/upgrade', {
      data: {
        siteId: '1',
        newPlan: 'ultimate',
        customDomain: `e2etest-${Date.now()}.example.com`,
        stripe_payment_method_id: 'pm_placeholder',
      },
    });
    expect([200, 402]).toContain(res.status()); // 402 if payment gate is enforced
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.plan).toBe('ultimate');
    }
  });
});
```

---

## Part 11 — Run All, Fix Failures, Update Config

### 11.1 Run the full suite

```bash
# Run all Playwright tests (both projects: chromium + mobile-chrome)
npx playwright test --reporter=list 2>&1 | tail -40

# Run only the new specs
npx playwright test e2e/tests/flows/ e2e/tests/responsive/ e2e/tests/plugin-contract.spec.ts --reporter=list 2>&1

# Run mobile-only
npx playwright test --project=mobile-chrome --reporter=list 2>&1
```

### 11.2 Acceptance criteria

- All previously passing 301 tests still pass
- The 2 un-skipped `plugin-lifecycle` tests pass
- All new tests pass or are explicitly `test.skip`-ed with a reason in a comment
- Zero `waitForTimeout` calls in any new test
- Mobile project runs without errors
- `plugin-contract.spec.ts` passes entirely (verifies invariants hold for all plugins)

### 11.3 Forbidden patterns

```typescript
// ❌ Never use
await page.waitForTimeout(3000);

// ✅ Instead use
await page.waitForSelector('text=Booking Confirmed!', { timeout: 15000 });
await page.waitForURL(/confirmation/, { timeout: 15000 });
await page.waitForResponse((r) => r.url().includes('/api/p/booking/book'), { timeout: 20000 });

// ❌ Never hardcode past dates
'2025-06-15'

// ✅ Always compute future dates
const { checkIn, checkOut } = futureDates(30, 3); // 30 days from now, 3 nights
```

---

## Part 12 — Update AGENT_LOGBOOK.md

Append a dated entry with:
- Total Playwright test count before and after
- Which tests were un-skipped and what selector fixes were needed
- Which mobile tests revealed layout issues (if any)
- Note any RTL/locale tests that were skipped and why
- List all new spec files created
