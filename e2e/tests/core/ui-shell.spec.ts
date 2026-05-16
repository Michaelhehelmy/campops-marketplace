import { test, expect } from '@playwright/test';

/**
 * Core E2E: UI Shell
 *
 * Verifies that the framework's UI shell renders correctly:
 *   - Homepage loads with core structural elements
 *   - Hero section renders with search form
 *   - Navigation structure is present
 *   - Locale routing works (/ redirects to /en/ or similar)
 */
test.describe('Core: UI Shell', () => {
  test('homepage loads and renders hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section[aria-label="Hero search section"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('hero section has a search form', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('form', { name: /search form/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('navigation is present on homepage', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('nav, header')).toBeVisible({ timeout: 10000 });
  });

  test('locale prefix /en renders without redirect loop', async ({ page }) => {
    const response = await page.goto('/en');
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/en');
  });

  test('page title is set', async ({ page }) => {
    await page.goto('/en');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
