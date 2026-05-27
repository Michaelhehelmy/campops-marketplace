import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../helpers/auth.fixture';

test.describe('Guest (logged-in user)', () => {
  test.describe('Authentication', () => {
    test('guest dashboard loads without auth', async ({ page }) => {
      await page.goto('/en/guest');
      await expect(page.locator('body')).not.toHaveText(/error/i);
    });
  });
});

authenticatedTest.describe('Authenticated guest journeys', () => {
  authenticatedTest('login and view dashboard', async ({ page, guestSession }) => {
    await page.goto('/en');
    // Set cookies from session
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest');
    await expect(page).toHaveURL(/\/en\/guest/);
  });

  authenticatedTest('view reservations list', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/\/en\/guest\/reservations/);
  });

  authenticatedTest('view following page', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest/following');
    await expect(page).toHaveURL(/\/en\/guest\/following/);
  });

  authenticatedTest('access settings page', async ({ page, guestSession }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/guest/settings');
    await expect(page).toHaveURL(/\/en\/guest\/settings/);
  });
});
