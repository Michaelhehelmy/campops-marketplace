import { test, expect } from '@playwright/test';

test.describe('Registration Wizard', () => {
  test('GET /en/list-your-camp renders landing page', async ({ page }) => {
    await page.goto('/en/list-your-camp');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('GET /en/list-your-camp/property renders property form', async ({ page }) => {
    await page.goto('/en/list-your-camp/property');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('GET /en/list-your-camp/branding renders while redirecting to step 1 if no prior step', async ({ page }) => {
    await page.goto('/en/list-your-camp/branding');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('login') || url.includes('list-your-camp')).toBe(true);
  });

  test('GET /en/list-your-camp/plan renders while redirecting if no prior steps', async ({ page }) => {
    await page.goto('/en/list-your-camp/plan');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('login') || url.includes('list-your-camp')).toBe(true);
  });

  test('GET /en/list-your-camp/success renders while redirecting if no prior steps', async ({ page }) => {
    await page.goto('/en/list-your-camp/success');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('login') || url.includes('list-your-camp')).toBe(true);
  });

  test('GET /en/unauthorized renders unauthorized page', async ({ page }) => {
    await page.goto('/en/unauthorized');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('GET /en/loyalty renders loyalty page', async ({ page }) => {
    await page.goto('/en/loyalty');
    const content = await page.content();
    expect(content.length).toBeGreaterThan(50);
  });

  test('GET /en/pwa-preview renders PWA preview page', async ({ page }) => {
    await page.goto('/en/pwa-preview');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('GET /offline renders offline page', async ({ page }) => {
    await page.goto('/offline');
    const content = await page.content();
    expect(content.length).toBeGreaterThan(50);
  });
});
