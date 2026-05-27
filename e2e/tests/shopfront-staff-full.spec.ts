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
    await expect(page.locator('body')).not.toHaveText(/error|not found/i, { timeout: 10000 });

    // 2. Bookings & Check-ins
    await page.goto('/en/manage/1/bookings');
    await expect(page.locator('body')).not.toHaveText(/error|not found/i, { timeout: 10000 });

    // 3. Restrictions — Finance and Settings should return non-200 or show error
    await page.goto('/en/manage/1/finance');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/finance');

    await page.goto('/en/manage/1/settings');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/settings');
  });
});
