import { test, expect } from '../helpers/auth.fixture';

test.describe('Shop Front Staff (Limited Access)', () => {
  test('Staff can view bookings and operations but not sensitive data', async ({
    page,
    staffSession,
  }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Staff can view bookings
    await page.goto('/en/manage/safari-camp/bookings');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/bookings/);
    await expect(page.getByRole('heading', { name: /Manage Bookings/i })).toBeVisible();

    // 2. Staff can view operations
    await page.goto('/en/manage/safari-camp/operations');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/operations/);

    // 3. Staff CANNOT access finance (should redirect or show error)
    await page.goto('/en/manage/safari-camp/finance');
    // For now, let's expect it to redirect to the dashboard or show "Access Denied"
    // After fixing the code, we'll verify the exact behavior.
    await expect(page).not.toHaveURL(/\/en\/manage\/safari-camp\/finance/);

    // 4. Staff CANNOT access settings
    await page.goto('/en/manage/safari-camp/settings');
    await expect(page).not.toHaveURL(/\/en\/manage\/safari-camp\/settings/);
  });

  test('Staff can handle check-ins', async ({ page, staffSession }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/bookings');

    // Find a pending booking and check-in
    const bookingRow = page
      .getByRole('row')
      .filter({ hasText: /Confirmed/i })
      .first();
    if (await bookingRow.isVisible()) {
      await bookingRow.getByRole('button', { name: /Check-in/i }).click();
      await expect(bookingRow.getByText(/Checked-in/i)).toBeVisible();
    }
  });
});
