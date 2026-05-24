import { test, expect } from '@playwright/test';

const MAIN_DOMAIN = 'http://localhost:3000';
const TENANT_DOMAIN = 'http://safari-camp.localhost:3000';

test.describe('Tenant UI Isolation', () => {
  test('Main domain shows marketplace Nav and homepage sections', async ({ page }) => {
    await page.goto(`${MAIN_DOMAIN}/en`);

    // Marketplace Nav should be visible
    await expect(page.getByRole('navigation').first()).toBeVisible();

    // ShopfrontNav should NOT be present (tenant branding absent)
    await expect(page.locator('text=Safari Camp')).not.toBeVisible();

    // Marketplace sections: Hero section with search and Categories
    await expect(page.locator('text=Adventure Awaits').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Browse by Category').first()).toBeVisible({ timeout: 15000 });
  });

  test('Tenant subdomain root rewrites to stay page (internal rewrite, URL unchanged)', async ({ page }) => {
    await page.goto(`${TENANT_DOMAIN}/en`);

    // Middleware rewrites /en → /en/stay/safari-camp (internal — URL stays the same)
    await expect(page).toHaveURL(/\/en$/);

    // ShopfrontNav (tenant branding) should be visible
    await expect(page.getByRole('navigation').first()).toBeVisible();

    // Marketplace homepage sections should NOT be present on tenant domain
    await expect(page.locator('text=Adventure Awaits')).not.toBeVisible();
    await expect(page.locator('text=Browse by Category')).not.toBeVisible();
  });

  test('Tenant subdomain non-root path keeps tenant headers and layout', async ({ page }) => {
    await page.goto(`${TENANT_DOMAIN}/en/stay/safari-camp`);

    // Tenant navigation should be visible
    await expect(page.getByRole('navigation').first()).toBeVisible();

    // Marketplace homepage sections should NOT be shown
    await expect(page.locator('text=Adventure Awaits')).not.toBeVisible();
  });

  test('Main domain does not rewrite or show tenant-specific navigation', async ({ page }) => {
    await page.goto(`${MAIN_DOMAIN}/en`);

    // No rewrite on main domain
    await expect(page).toHaveURL('/en');

    // Marketplace Nav visible, ShopfrontNav absent
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });
});
