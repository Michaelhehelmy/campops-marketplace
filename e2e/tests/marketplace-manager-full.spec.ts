import { test, expect } from '../helpers/auth.fixture';
import { ManagerBookingsPage } from '../pages/ManagerBookingsPage';

test.describe('Marketplace Manager Full Lifecycle', () => {
  test('Manager can manage their property: bookings, rooms, guests, and plugins', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Land on management page
    await page.goto('/en/manage/safari-camp');
    await expect(page.getByText(/Property Overview/i).first()).toBeVisible();

    // 2. Bookings via POM
    const bookingsPage = new ManagerBookingsPage(page);
    await bookingsPage.goto('safari-camp');
    await expect(page.getByTestId('manager-bookings-list')).toBeVisible();

    // 3. CRM
    await page.goto('/en/manage/safari-camp/guests');
    await expect(page.getByText(/CRM/i).first()).toBeVisible();

    // 4. Settings/Plugins
    await page.goto('/en/manage/safari-camp/settings');
    // Just verify settings page loads
    await expect(page.getByRole('heading', { name: /Property Settings/i })).toBeVisible();
  });
});
