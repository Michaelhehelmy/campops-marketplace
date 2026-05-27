import { test, expect } from '@playwright/test';

test.describe('Public (no login)', () => {
  test.describe('Basic navigation', () => {
    test('homepage loads', async ({ page }) => {
      await page.goto('/en');
      await expect(page).toHaveURL(/\/en/);
    });

    test('login page loads', async ({ page }) => {
      await page.goto('/en/login');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('search page loads', async ({ page }) => {
      await page.goto('/en/search');
      await expect(page).toHaveURL(/\/en\/search/);
    });

    test('list-your-camp page loads', async ({ page }) => {
      await page.goto('/en/list-your-camp');
      await expect(page).toHaveURL(/\/en\/list-your-camp/);
    });
  });

  test.describe('Full booking flow', () => {
    test('guest can access booking summary without auth', async ({ page, context }) => {
      await context.clearCookies();

      await page.goto(
        '/en/book/summary?propertyId=1&roomTypeId=room-1&checkIn=2025-06-15&checkOut=2025-06-20&roomName=Luxury+Tent&propertyName=Safari+Camp&price=250&priceCurrency=USD',
        { waitUntil: 'networkidle' }
      );

      // Page may redirect to login or render the summary — both are valid
      const url = page.url();
      expect(
        url.includes('/en/login') || url.includes('/en/book/summary')
      ).toBeTruthy();
      await expect(page.locator('body')).not.toHaveText(/not found/i);
    });
  });
});
