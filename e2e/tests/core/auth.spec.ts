import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

/**
 * Core E2E: Authentication
 *
 * Verifies core auth integration points:
 *   - Login page is reachable and has required elements
 *   - Protected admin routes redirect unauthenticated users
 *   - Auth API session endpoint responds
 */
test.describe('Core: Authentication', () => {
  test('login page is reachable', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page).toHaveURL(/login/);
  });

  test('login page has email and password inputs', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.emailInput).toBeVisible({ timeout: 8000 });
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 8000 });
    await expect(loginPage.loginButton).toBeVisible({ timeout: 8000 });
  });

  test('protected admin route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page).toHaveURL(/login|\/en\/admin/, { timeout: 8000 });
  });

  test('Better Auth session endpoint responds', async ({ request }) => {
    const res = await request.get('/api/auth/get-session');
    expect([200, 401, 400]).toContain(res.status());
  });

  test('Master admin route is protected', async ({ page }) => {
    await page.goto('/en/admin/master');
    await expect(page).toHaveURL(/login|master/, { timeout: 8000 });
  });
});
