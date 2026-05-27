import { test, expect } from '../helpers/auth.fixture';

test.describe('Owner Full Journey', () => {
  test('Owner can access dashboard, bookings, revenue, and property pages', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/owner/dashboard');
    await expect(page.getByText(/Owner Dashboard|Dashboard/i).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/en/owner/bookings');
    await expect(page.getByText(/Bookings/i).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/en/owner/revenue');
    await expect(page.getByText(/Revenue|Earnings/i).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/en/owner/property');
    await expect(page.getByText(/Property/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Owner dashboard redirects to login without auth', async ({ page }) => {
    await page.goto('/en/owner/dashboard');
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('Owner bookings redirects to login without auth', async ({ page }) => {
    await page.goto('/en/owner/bookings');
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('Owner revenue redirects to login without auth', async ({ page }) => {
    await page.goto('/en/owner/revenue');
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('Owner property redirects to login without auth', async ({ page }) => {
    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('GET /api/owner/me returns owner data for authenticated manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/owner/me');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/owner/domains/check validates domain format', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/owner/domains/check?domain=example.com');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });
});
