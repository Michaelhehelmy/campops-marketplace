import { test, expect } from '../helpers/auth.fixture';

test.describe('Marketplace Master Full Lifecycle', () => {
  test('Master can manage platform: dashboard, listings, admins, plugins, and settings', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Platform Overview
    await page.goto('/en/admin');
    await expect(page.getByText(/Platform Overview/i)).toBeVisible();

    // 2. Listing Management
    await page.goto('/en/admin/listings');
    await expect(page.getByText(/Property Listings/i)).toBeVisible();
    await expect(page.getByText(/Safari Camp/i).first()).toBeVisible();

    // 3. Admin Accounts
    await page.goto('/en/admin/accounts');
    await expect(page.getByText(/Admin Accounts/i)).toBeVisible();

    // 4. Plugins
    await page.goto('/en/admin/plugins');
    await expect(page.getByText(/Plugin Management/i)).toBeVisible();

    // 5. Global Settings
    await page.goto('/en/admin/settings');
    await expect(page.getByText(/Marketplace Settings/i)).toBeVisible();
  });
});
