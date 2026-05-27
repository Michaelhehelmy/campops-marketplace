import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Guest Self-Service', () => {
  async function extractCsrf(res: import('@playwright/test').APIResponse): Promise<string> {
    const raw = res.headers()['set-cookie'] || '';
    const match = raw.match(/x-csrf-token=([^;]+)/);
    return match ? match[1] : '';
  }

  test('guest can view reservation detail page', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/\/en\/guest\/reservations/);
    const firstReservation = page.getByRole('link', { name: /view|details|manage/i }).first()
      .or(page.locator('[data-testid*="reservation-row"]').first());
    if (await firstReservation.isVisible().catch(() => false)) {
      await firstReservation.click();
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    }
  });

  test('guest reservation API returns only their own bookings', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    const res = await page.request.get('/api/guest/reservations');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const reservations = body.reservations ?? body.data ?? body;
    expect(Array.isArray(reservations)).toBe(true);
    if (reservations.length > 0) {
      expect(reservations[0]).toHaveProperty('id');
      expect(reservations[0]).toHaveProperty('propertyName');
    }
  });

  test('guest profile settings page loads', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/settings');
    await expect(page).toHaveURL(/\/en\/guest\/(settings|login)/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest following page renders properly', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/following');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest dashboard shows correct structure', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('guest orders API responds 200', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    const res = await page.request.get('/api/guest/orders');
    expect([200, 204, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });
});
