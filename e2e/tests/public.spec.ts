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
    test('guest is redirected to login before booking', async ({ page }) => {
      // Navigate directly to a listing page with dates
      await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');

      // Wait for listing page to fully load (server component)
      await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

      // Proceed to booking — click first "Book now" link in a room card
      const bookButton = page
        .locator('[data-testid^="book-button-"], a:has-text("Book now")')
        .first();
      await expect(bookButton).toBeVisible({ timeout: 10000 });
      await bookButton.click();

      // Guest should be redirected to login page
      await page.waitForURL(/\/en\/login/, { timeout: 20000 });
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
