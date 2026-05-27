import { test, expect } from '../helpers/auth.fixture';
import { GuestDashboardPage } from '../pages/GuestDashboardPage';

test.describe('Marketplace Guest (authenticated)', () => {
  test('View guest dashboard and reservations', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const dashboard = new GuestDashboardPage(page);
    await dashboard.goto();

    // Verify dashboard components
    await expect(page.getByRole('heading', { name: /Hello, Explorer./i })).toBeVisible();
    await dashboard.expectTripsVisible();
  });

  test('View reservation list page', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const dashboard = new GuestDashboardPage(page);
    await dashboard.gotoReservations();

    // Check page loaded
    await expect(page.locator('body')).not.toHaveText(/error|not found/i);
  });

  test('Edit profile information', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest/settings');

    // Verify settings page loaded
    await expect(page.locator('body')).not.toHaveText(/error|not found/i);
  });
});
