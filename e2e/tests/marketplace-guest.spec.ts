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

    // Check for reservation list from plugin
    await expect(page.getByTestId('guest-reservations-list')).toBeVisible();
  });

  test('Edit profile information', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest/settings');

    // Fill profile form
    const nameInput = page.getByRole('textbox').first();
    await nameInput.fill('Updated Guest Name');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Verify update
    await expect(page.getByText(/Profile updated successfully/i)).toBeVisible();
  });
});
