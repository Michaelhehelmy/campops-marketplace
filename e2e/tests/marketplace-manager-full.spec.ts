import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/page-helpers';
import { ManagerBookingsPage } from '../pages/ManagerBookingsPage';

test.describe('Marketplace Manager Full Lifecycle', () => {
  test('Manager can manage their property: bookings, rooms, guests, and plugins', async ({
    page,
  }) => {
    await loginAs(page, 'safari@sinaicamps.com');

    // 1. Land on management page
    await page.goto('/en/manage/safari-camp');
    await expect(page.getByRole('heading', { name: /Property Overview/i })).toBeVisible();

    // 2. Bookings via POM
    const bookingsPage = new ManagerBookingsPage(page);
    await bookingsPage.goto('safari-camp');
    await expect(page.getByTestId('manager-bookings-list')).toBeVisible();

    // 3. CRM
    await page.goto('/en/manage/safari-camp/guests');
    await expect(page.getByRole('heading', { name: /CRM/i })).toBeVisible();

    // 4. Settings/Plugins
    await page.goto('/en/manage/safari-camp/settings');
    await expect(page.getByRole('heading', { name: /Property Settings/i })).toBeVisible();
  });
});
