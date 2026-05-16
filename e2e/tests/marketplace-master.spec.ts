import { test, expect } from '../helpers/auth.fixture';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test.describe('Marketplace Master (Global Admin)', () => {
  test('View global platform dashboard stats', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const adminPage = new AdminDashboardPage(page);
    await adminPage.goto();

    await expect(page.getByRole('heading', { name: /Platform Overview/i })).toBeVisible();
    await expect(page.getByText(/Total Listings/i).first()).toBeVisible();
  });

  test('Global plugin catalog management', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    const adminPage = new AdminDashboardPage(page);
    await adminPage.gotoPlugins();
    await expect(page.getByRole('heading', { name: /Plugin Management/i })).toBeVisible();

    // Toggle booking plugin platform-wide
    await adminPage.setPluginGlobalStatus('Marketplace Booking', 'disable');
    await adminPage.expectPluginStatus('Marketplace Booking', 'disabled');

    // Re-enable for other tests
    await adminPage.setPluginGlobalStatus('Marketplace Booking', 'enable');
    await adminPage.expectPluginStatus('Marketplace Booking', 'enabled');
  });

  test('Manage marketplace settings and branding', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/admin/settings');
    await expect(page.getByRole('heading', { name: /Marketplace Settings/i })).toBeVisible();

    // Update platform name
    const platformNameInput = page.getByLabel(/Platform Name/i);
    await platformNameInput.fill('CampOps Pro');
    await page.getByRole('button', { name: /Save Settings/i }).click();

    await expect(page.getByText(/Settings saved/i).first()).toBeVisible();
  });
});
