import { test, expect, type Page } from '@playwright/test';

/**
 * Log in through the browser UI instead of relying on addCookies.
 * This ensures Better Auth session cookies are properly set in the browser context
 * and are sent with client-side fetch() calls made by React pages.
 */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/en/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/en\/(admin|manage|guest|owner)/, { timeout: 15000 });
}

test.describe('Booking & CRM Plugin Integration E2E', () => {
  test('full flow: book and see activity', async ({ page }) => {
    // 1. Login as master to enable plugins
    await loginAs(page, 'master@sinaicamps.com', 'password123');

    // Navigate to admin plugins page and ensure booking + CRM are enabled
    await page.goto('/en/admin/plugins');
    await page.waitForTimeout(3000);

    // Find the "Enable Marketplace Booking plugin" button and click to enable if needed
    const bookingEnable = page.getByRole('button', { name: /Enable Marketplace Booking plugin/i });
    if (await bookingEnable.isVisible().catch(() => false)) {
      await bookingEnable.click();
      await page.waitForTimeout(2000);
      await expect(
        page.getByRole('button', { name: /Disable Marketplace Booking plugin/i })
      ).toBeVisible({ timeout: 10000 });
    }

    // Enable CRM if disabled
    const crmEnable = page.getByRole('button', { name: /Enable Customer Relations plugin/i });
    if (await crmEnable.isVisible().catch(() => false)) {
      await crmEnable.click();
      await page.waitForTimeout(2000);
      await expect(
        page.getByRole('button', { name: /Disable Customer Relations plugin/i })
      ).toBeVisible({ timeout: 10000 });
    }

    // 2. Login as guest and book
    await page.context().clearCookies();
    await loginAs(page, 'guest@sinaicamps.com', 'password123');

    // Navigate to listing page
    await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');

    // Check if booking widget exists
    const bookingWidget = page.getByRole('region', { name: /Book Your Stay/i });
    await expect(bookingWidget).toBeVisible({ timeout: 10000 });

    // Click "Book now" for the first room type
    await page
      .getByRole('link', { name: /Book now/i })
      .first()
      .click();

    // Fill in booking details on the summary page
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Fill guest name and email
    const nameInput = page.locator('#guestName');
    await nameInput.fill('John Guest');
    const emailInput = page.locator('#guestEmail');
    await emailInput.fill('guest@sinaicamps.com');

    // Proceed to payment
    await page.getByTestId('continue-to-payment').click();

    // Select "Pay Later" option
    await page.locator('#pay_later').click();

    // Confirm booking
    await page.getByRole('button', { name: /confirm booking/i }).click();
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible({ timeout: 15000 });

    // 3. Check CRM activity (guest is still logged in)
    await page.goto('/en/guest');
    await page.waitForTimeout(2000);

    const activityWidget = page.getByRole('region', { name: /Recent Activity/i });
    await expect(activityWidget).toBeVisible({ timeout: 10000 });
    await expect(activityWidget).toContainText('BOOKING CREATED');
  });

  test('Booking works even if CRM is disabled', async ({ page }) => {
    // 1. Login as master to toggle plugins
    await loginAs(page, 'master@sinaicamps.com', 'password123');

    await page.goto('/en/admin/plugins');
    await page.waitForTimeout(3000);

    // Ensure Booking is ON
    const bookingEnable = page.getByRole('button', { name: /Enable Marketplace Booking plugin/i });
    if (await bookingEnable.isVisible().catch(() => false)) {
      await bookingEnable.click();
      await page.waitForTimeout(2000);
    }
    await expect(
      page.getByRole('button', { name: /Disable Marketplace Booking plugin/i })
    ).toBeVisible({ timeout: 10000 });

    // Ensure CRM is OFF
    const crmDisable = page.getByRole('button', { name: /Disable Customer Relations plugin/i });
    if (await crmDisable.isVisible().catch(() => false)) {
      await crmDisable.click();
      await page.waitForTimeout(2000);
    }

    // 2. Book as guest
    await page.context().clearCookies();
    await loginAs(page, 'guest@sinaicamps.com', 'password123');

    await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');
    await page
      .getByRole('link', { name: /Book now/i })
      .first()
      .click();

    // Fill in booking details
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const nameInput = page.locator('#guestName');
    await nameInput.fill('John Guest');
    const emailInput = page.locator('#guestEmail');
    await emailInput.fill('guest@sinaicamps.com');

    // Proceed to payment
    await page.getByTestId('continue-to-payment').click();
    await page.locator('#pay_later').click();
    await page.getByRole('button', { name: /confirm booking/i }).click();
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible({ timeout: 15000 });
  });
});
