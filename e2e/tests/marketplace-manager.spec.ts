import { test, expect } from '../helpers/auth.fixture';
import { ManagerBookingsPage } from '../pages/ManagerBookingsPage';

test.describe('Marketplace Manager (Property Admin)', () => {
  test('View management dashboard with property stats', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp/);

    // Check for stats
    await expect(page.getByRole('heading', { name: /Property Overview/i })).toBeVisible();
  });

  test('Manage bookings: List and update booking status', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const bookingsPage = new ManagerBookingsPage(page);
    await bookingsPage.goto('safari-camp');

    // We expect some bookings from the seed
    // Since we can't easily 'Add' yet, we check for visibility of a seeded one
    // and test the check-in flow if available.
    await expect(page.getByTestId('manager-bookings-list')).toBeVisible();

    // Test check-in if a confirmed booking exists
    const checkInBtn = page.getByTestId(/^check-in-button-/).first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      // Should show check-out button now
      await expect(page.getByTestId(/^check-out-button-/).first()).toBeVisible();
    }
  });

  test('Manage guests (CRM)', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/guests');
    await expect(page.getByRole('heading', { name: /CRM/i })).toBeVisible();
  });
});
