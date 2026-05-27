import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Mobile: Public pages', () => {
  test('homepage loads and is not horizontally scrollable', async ({ page }) => {
    await page.goto('/en');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('listing page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/en/stay/safari-camp');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('login page is usable on mobile', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-button')).toBeVisible();
    const loginBtn = page.getByTestId('login-button');
    const box = await loginBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Mobile: Authenticated flows', () => {
  test('guest dashboard is readable on mobile', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('manager dashboard is usable on mobile', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('registration step 1 is completable on mobile', async ({ page }) => {
    await page.goto('/en/list-your-camp');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    const emailBox = await page.getByLabel(/email/i).boundingBox();
    expect(emailBox?.x).toBeGreaterThanOrEqual(0);
    expect((emailBox?.x ?? 0) + (emailBox?.width ?? 0)).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 375) + 1
    );
  });
});
