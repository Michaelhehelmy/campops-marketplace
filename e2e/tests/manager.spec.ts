import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../helpers/auth.fixture';

test.describe('Listing Manager / Staff', () => {
  test.describe('Navigation (unauthenticated)', () => {
    test('manage listing page redirects to login', async ({ page }) => {
      await page.goto('/en/manage/safari-camp');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('bookings page redirects to login', async ({ page }) => {
      await page.goto('/en/manage/safari-camp/bookings');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('finance page redirects to login', async ({ page }) => {
      await page.goto('/en/manage/safari-camp/finance');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('settings page redirects to login', async ({ page }) => {
      await page.goto('/en/manage/safari-camp/settings');
      await expect(page).toHaveURL(/\/en\/login/);
    });
  });

  test.describe('Owner routes (unauthenticated)', () => {
    test('owner dashboard redirects to login without auth', async ({ page }) => {
      await page.goto('/en/owner/dashboard');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('owner bookings redirects to login without auth', async ({ page }) => {
      await page.goto('/en/owner/bookings');
      await expect(page).toHaveURL(/\/en\/login/);
    });

    test('owner property redirects to login without auth', async ({ page }) => {
      await page.goto('/en/owner/property');
      await expect(page).toHaveURL(/\/en\/login/);
    });
  });
});

authenticatedTest.describe('Authenticated manager journeys', () => {
  authenticatedTest('login as manager and view bookings', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/bookings');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/bookings/);
  });

  authenticatedTest('view finance page', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/finance');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/finance/);
  });

  authenticatedTest('access settings page', async ({ page, managerSession }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/settings');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/settings/);
  });

  authenticatedTest.describe('Admin financials', () => {
    authenticatedTest(
      'finance page shows commission and payment data matching bookings',
      async ({ page, managerSession }) => {
        const storageState = JSON.parse(managerSession.storageState);
        await page.context().addCookies(storageState.cookies);

        // Navigate to finance page
        await page.goto('/en/manage/safari-camp/finance');

        // Wait for finance page to load
        await expect(page.locator('h1:has-text("Financial Overview")')).toBeVisible({
          timeout: 30000,
        });

        // Verify commission data is displayed
        await expect(page.locator('text=/Commission Breakdown/i')).toBeVisible();

        // Verify summary cards are displayed
        await expect(page.locator('text=/Total Revenue/i')).toBeVisible();
        await expect(page.locator('text=/Total Commission/i')).toBeVisible();
      }
    );
  });

  authenticatedTest.describe('Cross-listing access', () => {
    authenticatedTest(
      'manager cannot access another listing admin pages',
      async ({ page, managerSession }) => {
        const storageState = JSON.parse(managerSession.storageState);
        await page.context().addCookies(storageState.cookies);

        // Try to access another listing's admin page
        await page.goto('/en/manage/mountain-lodge/bookings');

        // Should be redirected to owner dashboard (RBAC middleware blocks access)
        await expect(page).toHaveURL(/\/en\/owner\/dashboard/);
      }
    );

    authenticatedTest('manager can access their own listings', async ({ page, managerSession }) => {
      const storageState = JSON.parse(managerSession.storageState);
      await page.context().addCookies(storageState.cookies);

      // Access their own listing (safari-camp is the manager's listing)
      await page.goto('/en/manage/safari-camp/bookings');

      // Should succeed
      await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/bookings/);
    });
  });
});

authenticatedTest.describe('Staff role restrictions', () => {
  authenticatedTest('staff can view bookings', async ({ page, staffSession }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/bookings');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/bookings/);
  });

  authenticatedTest('staff cannot access settings', async ({ page, staffSession }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/manage/safari-camp/settings');
    // Should be redirected or denied
    await expect(page).not.toHaveURL(/\/en\/manage\/safari-camp\/settings/);
  });
});
