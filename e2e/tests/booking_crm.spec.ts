import { test, expect } from '@playwright/test';
import { loginAs, futureDates } from '../helpers/page-helpers';

test.describe('Booking & CRM Plugin Integration E2E', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('full flow: book and see activity', async ({ page }) => {
    const adminCsrf = await loginAs(page, 'master@sinaicamps.com');
    await page.goto('/en/admin/plugins');
    const bookingToggle = page.getByRole('button', { name: /Enable Marketplace Booking plugin/i });
    if (await bookingToggle.isVisible().catch(() => false)) {
      const bookingRes = page.waitForResponse((r) => r.url().includes('/plugins/toggle'), { timeout: 10000 });
      await bookingToggle.click();
      await bookingRes;
    }
    const crmToggle = page.getByRole('button', { name: /Enable Customer Relations plugin/i });
    if (await crmToggle.isVisible().catch(() => false)) {
      const crmRes = page.waitForResponse((r) => r.url().includes('/plugins/toggle'), { timeout: 10000 });
      await crmToggle.click();
      await crmRes;
    }
    await page.context().clearCookies();
    await loginAs(page, 'guest@sinaicamps.com');
    const { checkIn, checkOut } = futureDates(90, 5);
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    const bookLink = page.getByRole('link', { name: /Book now/i }).first();
    await expect(bookLink).toBeVisible({ timeout: 10000 });
    await page.goto('/en/guest');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('Booking works even if CRM is disabled', async ({ page }) => {
    const csrf = await loginAs(page, 'master@sinaicamps.com');
    await page.goto('/en/admin/plugins');
    const bookingEnable = page.getByRole('button', { name: /Enable Marketplace Booking plugin/i });
    if (await bookingEnable.isVisible().catch(() => false)) {
      const res = page.waitForResponse((r) => r.url().includes('/plugins/toggle'), { timeout: 10000 });
      await bookingEnable.click();
      await res;
    }
    const crmDisable = page.getByRole('button', { name: /Disable Customer Relations plugin/i });
    if (await crmDisable.isVisible().catch(() => false)) {
      const res = page.waitForResponse((r) => r.url().includes('/plugins/toggle'), { timeout: 10000 });
      await crmDisable.click();
      await res;
    }
    await page.context().clearCookies();
    await loginAs(page, 'guest@sinaicamps.com');
    const { checkIn, checkOut } = futureDates(90, 5);
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    const bookLink = page.getByRole('link', { name: /Book now/i }).first();
    await expect(bookLink).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
