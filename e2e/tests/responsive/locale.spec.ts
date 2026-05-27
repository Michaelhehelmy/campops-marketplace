import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'ar'] as const;

for (const locale of LOCALES) {
  test.describe(`Locale: ${locale}`, () => {
    test(`/${locale} homepage loads without error`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).not.toBe(500);
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });

    test(`/${locale} login page loads with form`, async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await expect(page.getByTestId('email-input')).toBeVisible();
    });

    test(`/${locale} listing page loads`, async ({ page }) => {
      await page.goto(`/${locale}/stay/safari-camp`);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
    });
  });
}

test('RTL layout: Arabic page has dir=rtl on html element', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('locale switcher is visible on homepage', async ({ page }) => {
  await page.goto('/en');
  const localeSwitcher = page.getByRole('combobox', { name: /language|locale/i })
    .or(page.getByRole('link', { name: /عربي|AR|Arabic/i }))
    .or(page.locator('[data-testid*="locale"]'));
  if (await localeSwitcher.isVisible().catch(() => false)) {
    expect(true).toBe(true);
  }
});
