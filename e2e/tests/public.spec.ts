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
    test('select listing, book dates, confirm', async ({ page }) => {
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

      // Wait for summary page to load and hydrate (client component + Suspense)
      await page.waitForURL(/\/book\/summary/, { timeout: 20000 });
      await expect(
        page.locator('h2:has-text("Guest details"), h2:has-text("guest details")')
      ).toBeVisible({ timeout: 20000 });

      // Fill guest information
      await page.getByPlaceholder('Jane Smith').fill('Test Guest');
      await page.getByPlaceholder('jane@example.com').fill('test@example.com');
      await page.fill('input[name="adults"]', '2');

      // Proceed to payment
      await page.click('button:has-text("Continue to payment")');

      // Select pay at property option
      await page.click('input[value="pay_later"]');

      // Confirm booking
      await page.click('button:has-text("Confirm Booking"), button:has-text("Confirm booking")');

      // Verify confirmation
      await expect(page.locator('h1:has-text("Booking Confirmed!")')).toBeVisible({
        timeout: 20000,
      });
    });
  });
});
