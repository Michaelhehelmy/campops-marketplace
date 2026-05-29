import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Ultimate-Tier Custom Domain Redirect E2E', () => {
  test('redirects acacia@acaciacamp.com to acaciacamp.com custom domain after successful login', async ({
    page,
  }) => {
    // 1. Setup request interception to mock the custom domain destination
    // In local dev, FORCE_LOCAL_REDIRECT redirects to localhost:3000
    await page.route('http://localhost:3000/en/manage/3**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<h1>Welcome to Acacia Camp External Custom Domain</h1>',
      });
    });

    // 2. Navigate to central marketplace login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // 3. Log in as acacia@acaciacamp.com
    await loginPage.login('acacia@acaciacamp.com', 'password123');

    // 4. Verify redirection to custom domain (local dev uses localhost:3000)
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/en\/manage\/3/);

    // 5. Check the rendered content
    await expect(page.locator('h1')).toHaveText('Welcome to Acacia Camp External Custom Domain');
  });
});
