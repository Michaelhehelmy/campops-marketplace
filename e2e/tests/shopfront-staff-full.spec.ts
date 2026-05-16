import { test, expect } from '../helpers/auth.fixture';

test.describe('Shop Front Staff Full Lifecycle', () => {
  test('Staff can manage bookings and check-ins but are restricted from finance/settings', async ({
    page,
    staffSession,
  }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Land on management page (Safari Camp ID: 1)
    await page.goto('/en/manage/1');
    await expect(page.getByText(/Safari Camp/i).first()).toBeVisible();

    // 2. Bookings & Check-ins
    await page.goto('/en/manage/1/bookings');

    // Wait for layout spinner to clear (listing access API)
    await expect(page.locator('[class*="animate-spin"]')).not.toBeVisible({ timeout: 20000 });

    // Wait for the bookings page to load with the correct heading
    await expect(page.getByRole('heading', { name: /Manage Bookings/i })).toBeVisible({
      timeout: 20000,
    });

    // Wait for bookings table to load
    const bookingRow = page
      .getByRole('row')
      .filter({ hasText: /confirmed/i })
      .first();
    await expect(bookingRow).toBeVisible({ timeout: 20000 });

    // Find a confirmed booking and check in using data-testid
    const checkInBtn = page.getByTestId(/check-in-/).first();
    await checkInBtn.click();
    await expect(page.getByText(/checked-in/i)).toBeVisible({ timeout: 20000 });

    // 3. Restrictions
    // Finance should be hidden or 403
    await page.goto('/en/manage/1/finance');
    await expect(
      page.getByText(/Unauthorized|Redirecting/i).or(page.locator('h1', { hasText: '403' }))
    ).toBeVisible();

    // Settings should be hidden or 403
    await page.goto('/en/manage/1/settings');
    await expect(
      page.getByText(/Unauthorized|Redirecting/i).or(page.locator('h1', { hasText: '403' }))
    ).toBeVisible();
  });
});
