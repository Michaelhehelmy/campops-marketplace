import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Ultimate-Tier Custom Domain Redirect E2E', () => {
  test('redirects admin@acaciacamp.com to acaciacamp.com custom domain after successful login', async ({ page }) => {
    // 1. Setup request interception to mock the external custom domain destination
    await page.route('https://acaciacamp.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<h1>Welcome to Acacia Camp External Custom Domain</h1>',
      });
    });

    // 2. Navigate to central marketplace login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // 3. Log in as admin@acaciacamp.com
    await loginPage.login('admin@acaciacamp.com', 'password123');

    // 4. Verify redirection to custom domain
    await expect(page).toHaveURL(/https:\/\/acaciacamp\.com\/en\/manage\/3/);

    // 5. Check the rendered content on intercepted custom domain
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Welcome to Acacia Camp External Custom Domain');
  });
});
