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
    test('guest is redirected to login before booking', async ({ page, context }) => {
      // Ensure no leftover session from browser profile
      await context.clearCookies();

      // Navigate directly to the booking summary as an unauthenticated guest
      await page.goto(
        '/en/book/summary?propertyId=1&roomTypeId=room-1&checkIn=2025-06-15&checkOut=2025-06-20&roomName=Luxury+Tent&propertyName=Safari+Camp&price=250&priceCurrency=USD',
        { waitUntil: 'networkidle' }
      );

      // The booking summary page should redirect unauthenticated users to login
      await expect(async () => {
        const url = page.url();
        expect(url).toContain('/en/login');
      }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });

      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
        timeout: 15000,
      });
    });
  });
});
