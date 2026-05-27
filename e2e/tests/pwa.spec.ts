import { test, expect } from '@playwright/test';

test.describe('PWA Plugin E2E', () => {
  test('PWA banner shows with pwa-preview flag', async ({ page }) => {
    await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');

    await page.evaluate(() => {
      localStorage.setItem('pwa-preview', 'true');
    });
    await page.reload();

    const banner = page.getByTestId('pwa-install-banner').first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Install/i);
  });
});
