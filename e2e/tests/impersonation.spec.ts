import { test, expect } from '@playwright/test';

test.describe('Master Admin Impersonation', () => {
  test.beforeAll(async ({ request }) => {
    const reset = await request.post('http://localhost:3000/api/test/reset');
    expect(reset.ok()).toBeTruthy();
  });

  async function signInAsMaster(page: import('@playwright/test').Page) {
    await page.goto('/en/login');
    await page.waitForLoadState('networkidle');

    // Fill in login form
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ timeout: 15000 });
    await emailInput.fill('master@sinaicamps.com');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password123');

    await page.getByRole('button', { name: /sign.?in|log.?in|submit/i }).click();

    // Wait for redirect to admin
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  }

  test('Master logs in via browser, navigates to listing detail, impersonates a property', async ({
    page,
  }) => {
    // 1. Login as master via browser form
    await signInAsMaster(page);

    // 2. Navigate to admin listings page
    await page.goto('/en/admin/listings');
    await expect(page.getByText('Property Listings')).toBeVisible({ timeout: 15000 });

    // 3. Click Manage on Safari Camp row
    const safariRow = page.getByRole('row').filter({ hasText: /Safari Camp/i });
    await safariRow.getByRole('link', { name: /Manage/i }).click();
    await expect(page).toHaveURL(/\/admin\/listings\/1/);
    await expect(page.getByText('Safari Camp').first()).toBeVisible({ timeout: 10000 });

    // 4. Click "Login as Owner" button in Quick Actions
    const loginBtn = page.getByRole('button', { name: /Login as Owner/i });
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
    await loginBtn.click();

    // 5. Verify the success toast appears
    await expect(page.getByText(/Logged in as owner/i)).toBeVisible({ timeout: 10000 });

    // 6. Wait for redirect to the manage page
    await page.waitForURL(/\/manage\/safari-camp/, { timeout: 20000 });
    await expect(page.getByText('Listing Admin')).toBeVisible({ timeout: 15000 });

    // 7. Click a sidebar nav item (Bookings) — verify routing stays in manage context
    await page.getByRole('link', { name: /Bookings/i }).click();
    await expect(page).toHaveURL(/\/manage\/safari-camp\/bookings/);

    // 8. Click Dashboard in sidebar — verify back to manage dashboard
    await page
      .locator('aside')
      .getByRole('link', { name: /^Dashboard$/ })
      .click();
    await expect(page).toHaveURL(/\/manage\/safari-camp$/);

    // 9. Navigate to the shopfront page while impersonation cookie is active
    await page.goto('/en/stay/safari-camp');
    await expect(page.getByText('Safari Camp').first()).toBeVisible({ timeout: 15000 });

    // 10. The ShopfrontNav Dashboard link should point to manage, not admin
    const dashboardLink = page.locator('a').filter({ hasText: /Dashboard/i });
    const href = await dashboardLink.getAttribute('href');
    expect(href).toContain('/manage/safari-camp');
    expect(href).not.toContain('/admin');
  });

  test('Owner/me API returns impersonated property data when impersonation cookie is set', async ({
    request,
  }) => {
    // Login as master — Playwright APIRequestContext stores cookies automatically
    const loginRes = await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Get CSRF token from the login response
    const rawCookies = loginRes.headers()['set-cookie'] || '';
    const csrfMatch = rawCookies.match(/x-csrf-token=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // Create impersonation session — session cookies forwarded automatically,
    // and the response's Set-Cookie for sinaicamps_impersonating is stored
    const impersonateRes = await request.post('http://localhost:3000/api/admin/impersonate', {
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      data: { propertyId: '1', locale: 'en' },
    });
    expect(impersonateRes.ok()).toBeTruthy();
    const impersonateBody = await impersonateRes.json();
    expect(impersonateBody.redirectUrl).toBe('/en/manage/safari-camp');
    expect(impersonateBody.property.slug).toBe('safari-camp');

    // Owner/me — cookies (session + impersonation) are forwarded automatically
    const ownerMeRes = await request.get('http://localhost:3000/api/owner/me');
    expect(ownerMeRes.ok()).toBeTruthy();
    const ownerMeBody = await ownerMeRes.json();
    expect(ownerMeBody.property.slug).toBe('safari-camp');
    expect(ownerMeBody.user.impersonating).toBe(true);
    expect(ownerMeBody.user.impersonatingProperty).toBe('Safari Camp');
  });
});
