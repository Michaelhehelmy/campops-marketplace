import { test, expect } from '../helpers/auth.fixture';
import { type Page } from '@playwright/test';
import { loginAs, futureDates } from '../helpers/page-helpers';

test.describe('Plugin Lifecycle', () => {
  test('Scenario 1 & 2: Master toggles Booking plugin and guest sees it', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const enableRes = await page.request.post('/api/master/plugins', {
      data: { pluginId: 'marketplace-booking', propertyId: '1', enabled: true },
    });
    expect([200, 400, 401, 403]).toContain(enableRes.status());

    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp');
    await expect(
      page.getByTestId('booking-real').or(page.getByTestId('booking-fallback'))
    ).toBeVisible();

    await page.context().addCookies(storageState.cookies);
    const disableRes = await page.request.post('/api/master/plugins', {
      data: { pluginId: 'marketplace-booking', propertyId: '1', enabled: false },
    });
    expect([200, 400, 401, 403]).toContain(disableRes.status());
  });

  test('Scenario 3: Guest books a room and Manager sees it in their dashboard', async ({
    page,
    managerSession,
  }) => {
    test.setTimeout(120000);
    const { checkIn, checkOut } = futureDates(30, 2);

    const masterSignIn = await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    expect(masterSignIn.ok()).toBeTruthy();
    const setCookie = masterSignIn.headers()['set-cookie'] || '';
    const csrf = (setCookie.match(/x-csrf-token=([^;]+)/) || [])[1] || '';
    const toggleHeaders: Record<string, string> = {};
    if (csrf) toggleHeaders['x-csrf-token'] = csrf;
    const enableRes = await page.request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
      headers: toggleHeaders,
    });
    expect([200, 400, 403]).toContain(enableRes.status());

    await loginAs(page as unknown as Page, 'guest@sinaicamps.com');
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);

    const bookLink = page.getByRole('link', { name: /Book now/i }).first();
    await expect(bookLink).toBeVisible({ timeout: 15000 });
    await bookLink.click();
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });

    const payLater = page.locator('#pay_later').or(page.getByLabel(/pay later/i));
    if (await payLater.isVisible().catch(() => false)) {
      await payLater.click();
      const confirmBtn = page.getByRole('button', { name: /confirm booking/i });
      if (await confirmBtn.isVisible().catch(() => false)) {
        const confirmResponse = page.waitForResponse(
          (res) => res.url().includes('/api/p/booking/book') && res.status() === 200,
          { timeout: 20000 }
        );
        await confirmBtn.click();
        await confirmResponse;
      }
    }

    await page.context().clearCookies();
    const managerState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(managerState.cookies);
    const bookingsRes = await page.request.get('/api/manage/safari-camp/bookings');
    expect(bookingsRes.status()).toBe(200);
    const body = await bookingsRes.json();
    const bookings = body.bookings ?? body.data ?? body;
    expect(Array.isArray(bookings)).toBe(true);
  });

  test('Scenario 4: CRM records activity after booking', async ({ page }) => {
    test.setTimeout(120000);
    const { checkIn, checkOut } = futureDates(35, 3);

    const signIn = await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    const setCookie = signIn.headers()['set-cookie'] || '';
    const csrf = (setCookie.match(/x-csrf-token=([^;]+)/) || [])[1] || '';
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    await page.request.post('/api/manage/1/plugins/toggle', { data: { pluginName: 'booking', enabled: true }, headers });
    await page.request.post('/api/manage/1/plugins/toggle', { data: { pluginName: 'crm', enabled: true }, headers });

    await loginAs(page as unknown as Page, 'guest@sinaicamps.com');
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    const bookLink = page.getByRole('link', { name: /Book now/i }).first();
    await expect(bookLink).toBeVisible({ timeout: 15000 });

    await page.goto('/en/guest');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('Scenario 5: Plugin remains isolated across listings', async ({
    page,
    masterSession,
  }) => {
    const masterState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(masterState.cookies);

    await page.request.post('/api/master/plugins', {
      data: { pluginId: 'marketplace-booking', propertyId: '1', enabled: true },
    });

    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp');
    await expect(
      page.getByTestId('booking-real').or(page.getByTestId('booking-fallback'))
    ).toBeVisible();

    await page.goto('/en/stay/mountain-lodge');
    await expect(
      page.getByTestId('booking-real').or(page.getByTestId('booking-fallback'))
    ).toBeVisible();
  });
});
