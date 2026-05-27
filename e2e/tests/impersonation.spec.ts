import { test, expect } from '../helpers/auth.fixture';

test.describe('Master Admin Impersonation', () => {
  test.beforeAll(async ({ request }) => {
    const reset = await request.post('http://localhost:3000/api/test/reset');
    expect(reset.ok()).toBeTruthy();
  });

  test('Master logs in via browser, navigates to listing detail, impersonates a property', async ({
    masterSession,
    page,
  }) => {
    const state = JSON.parse(masterSession.storageState);
    console.log('[TEST] Number of cookies in state:', state.cookies.length);
    state.cookies.forEach((c: any) => {
      console.log(`[TEST] Cookie: ${c.name}=${c.value.substring(0, 20)}... domain=${c.domain} path=${c.path}`);
    });
    await page.context().addCookies(state.cookies);

    await page.goto('/en/admin/listings/1');

    // Debug: check cookies in the browser
    const browserCookies = await page.evaluate(() => document.cookie);
    console.log('[TEST] Browser cookies:', browserCookies);
    const reqCookies = await page.evaluate(() => {
      return fetch('/api/master/listings/1', { method: 'GET' })
        .then(r => r.status + ': ' + r.statusText)
        .catch(e => 'error: ' + e.message);
    });
    console.log('[TEST] API response:', reqCookies);

    // Debug: check what the page HTML looks like
    const pageHtml = await page.evaluate(() => document.querySelector('main')?.innerHTML?.substring(0, 500));
    console.log('[TEST] Page HTML:', pageHtml);

    // Debug: screenshot
    await page.screenshot({ path: '/tmp/admin-listing-debug.png', fullPage: true });

    await expect(page.getByText('Safari Camp').first()).toBeVisible({ timeout: 15000 });

    // Continue with rest of test...
  });
});
