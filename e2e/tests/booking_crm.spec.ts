import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../helpers/auth.fixture';

test.describe('Booking & CRM Plugin Integration E2E', () => {
  authenticatedTest(
    'full flow: book and see activity',
    async ({ page, masterSession, guestSession }) => {
      // TODO: Fix booking widget rendering - component not being found
      // 1. Login as master to enable plugins
      const storageState = JSON.parse(masterSession.storageState);
      await page.context().addCookies(storageState.cookies);

      // Enable Booking if disabled
      await page.goto('/en/admin/plugins');
      const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
      if ((await bookingToggle.textContent())?.includes('Disabled')) {
        await bookingToggle.click();
        await expect(
          page.getByRole('button', { name: /Disable Marketplace Booking/i })
        ).toBeVisible();
      }

      // Enable CRM if disabled
      const crmToggle = page.getByRole('button', { name: /Customer Relations/i });
      if ((await crmToggle.textContent())?.includes('Disabled')) {
        await crmToggle.click();
        await expect(
          page.getByRole('button', { name: /Disable Customer Relations/i })
        ).toBeVisible();
      }

      // 2. Visit listing as guest and book
      await page.context().clearCookies();
      await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');

      // Check if booking widget exists
      const bookingWidget = page.getByRole('region', { name: /Book Your Stay/i });
      await expect(bookingWidget).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /Reserve Now/i }).click();
      await expect(page.locator('text=Booking Confirmed!')).toBeVisible({ timeout: 10000 });

      // 3. Login as guest and check CRM activity
      const guestState = JSON.parse(guestSession.storageState);
      await page.context().addCookies(guestState.cookies);
      await page.goto('/en/guest');

      const activityWidget = page.getByRole('region', { name: /Recent Activity/i });
      await expect(activityWidget).toBeVisible();
      await expect(activityWidget).toContainText('BOOKING CREATED');
    }
  );

  authenticatedTest('Booking works even if CRM is disabled', async ({ page, masterSession }) => {
    // 1. Login as master to toggle
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/admin/plugins');
    // Ensure Booking is ON, CRM is OFF
    const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
    const crmToggle = page.getByRole('button', { name: /Customer Relations/i });

    if ((await bookingToggle.textContent())?.includes('Disabled')) await bookingToggle.click();
    if ((await crmToggle.textContent())?.includes('Enabled')) await crmToggle.click();

    await expect(page.getByRole('button', { name: /Disable Marketplace Booking/i })).toBeVisible();

    // 2. Book as guest
    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');
    await page.getByRole('button', { name: /Reserve Now/i }).click();
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible();

    // 3. Verify NO CRM activity (widget should be missing)
    await page.goto('/en/guest');
    await expect(page.getByRole('region', { name: /Recent Activity/i })).not.toBeVisible();
  });
});
