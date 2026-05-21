import { test, expect } from '../../helpers/auth.fixture';
import type { Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const PASSWORD = 'password123';

interface AuditResult {
  page: string;
  element: string;
  action: string;
  result: 'PASS' | 'FAIL';
  error?: string;
  consoleErrors: string[];
}

const results: AuditResult[] = [];
const allConsoleErrors: { page: string; text: string }[] = [];

async function audit(
  page: Page,
  pageName: string,
  element: string,
  action: string,
  fn: () => Promise<void>
) {
  const consoleErrors: string[] = [];
  const handler = (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', handler);
  try {
    await fn();
    results.push({
      page: pageName,
      element,
      action,
      result: 'PASS',
      consoleErrors: [...consoleErrors],
    });
  } catch (e: any) {
    results.push({
      page: pageName,
      element,
      action,
      result: 'FAIL',
      error: e.message?.slice(0, 200),
      consoleErrors: [...consoleErrors],
    });
  }
  for (const ce of consoleErrors) allConsoleErrors.push({ page: pageName, text: ce });
  page.off('console', handler);
}

async function applySession(page: Page, session: { storageState: string }) {
  const state = JSON.parse(session.storageState);
  await page.context().addCookies(state.cookies);
}

async function clearAndApply(page: Page, session: { storageState: string }) {
  await page.context().clearCookies();
  await applySession(page, session);
}

test.describe('Frontend Functionality Audit', () => {
  test.describe.configure({ timeout: 300000 });

  test('1. Public Pages', async ({ page }) => {
    await audit(page, 'Homepage', 'page load', 'navigate', async () => {
      await page.goto(`${BASE}/en`);
      await expect(page.locator('body')).toBeVisible();
    });
    await audit(page, 'Homepage', 'hero heading', 'visible', async () => {
      await expect(page.getByText(/Adventure Awaits/i)).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Homepage', 'nav search link', 'click', async () => {
      const link = page.getByRole('link', { name: /search/i }).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForTimeout(1000);
      }
    });
    await audit(page, 'Homepage', 'nav login link', 'click', async () => {
      await page.goto(`${BASE}/en`);
      const link = page.getByRole('link', { name: /sign in|login/i }).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForTimeout(1000);
      }
    });
    await audit(page, 'Homepage', 'featured listing card', 'click', async () => {
      await page.goto(`${BASE}/en`);
      const card = page.locator('a[href*="/stay/"]').first();
      if (await card.isVisible().catch(() => false)) {
        await card.click();
        await page.waitForTimeout(1000);
      }
    });

    await audit(page, 'Search', 'page load', 'navigate', async () => {
      await page.goto(`${BASE}/en/search`);
      await expect(page.locator('body')).toBeVisible();
    });
    await audit(page, 'Search', 'heading', 'visible', async () => {
      await expect(page.getByText(/find your perfect stay/i)).toBeVisible({ timeout: 5000 });
    });

    await audit(page, 'Listing Detail', 'page load', 'navigate', async () => {
      await page.goto(`${BASE}/en/stay/safari-camp`);
      await expect(page.locator('body')).toBeVisible();
    });
    await audit(page, 'Listing Detail', 'property name', 'visible', async () => {
      await expect(page.getByText(/Safari Camp/i).first()).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Listing Detail', 'room types heading', 'visible', async () => {
      await expect(page.getByText(/Room types/i)).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Listing Detail', 'room cards', 'visible', async () => {
      await expect(page.getByTestId('room-item-room-1')).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Listing Detail', 'check-in input', 'visible', async () => {
      await expect(page.getByTestId('check-in-input')).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Listing Detail', 'search button', 'visible', async () => {
      await expect(page.getByTestId('search-button')).toBeVisible({ timeout: 5000 });
    });

    await audit(page, 'Login', 'page load', 'navigate', async () => {
      await page.goto(`${BASE}/en/login`);
      await expect(page.locator('body')).toBeVisible();
    });
    await audit(page, 'Login', 'heading', 'visible', async () => {
      await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Login', 'email input', 'visible', async () => {
      await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Login', 'password input', 'visible', async () => {
      await expect(page.getByTestId('password-input')).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Login', 'login button', 'visible', async () => {
      await expect(page.getByTestId('login-button')).toBeVisible({ timeout: 5000 });
    });
    await audit(page, 'Login', 'register link', 'visible', async () => {
      await expect(page.getByRole('link', { name: /register/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test('2. Guest Dashboard', async ({ page, guestSession }) => {
    await clearAndApply(page, guestSession);
    for (const p of ['/en/guest', '/en/guest/reservations', '/en/guest/profile']) {
      await audit(page, p, 'page load', 'navigate', async () => {
        await page.goto(`${BASE}${p}`);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test('3. Property Admin Dashboard', async ({ page, managerSession }) => {
    await clearAndApply(page, managerSession);
    for (const p of [
      '/en/manage/1',
      '/en/manage/1/bookings',
      '/en/manage/1/rooms',
      '/en/manage/1/plugins',
      '/en/manage/1/settings',
    ]) {
      await audit(page, p, 'page load', 'navigate', async () => {
        await page.goto(`${BASE}${p}`);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test('4. Master Admin Dashboard', async ({ page, masterSession }) => {
    await clearAndApply(page, masterSession);
    for (const p of [
      '/en/master',
      '/en/master/listings',
      '/en/master/plugins',
      '/en/master/admins',
      '/en/master/settings',
    ]) {
      await audit(page, p, 'page load', 'navigate', async () => {
        await page.goto(`${BASE}${p}`);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test('5. Console Error Collection', async ({ page, masterSession, guestSession }) => {
    test.setTimeout(300000);
    const pagesToCheck: { url: string; auth: any }[] = [
      { url: '/en', auth: null },
      { url: '/en/search', auth: null },
      { url: '/en/stay/safari-camp', auth: null },
      { url: '/en/login', auth: null },
      { url: '/en/guest', auth: guestSession },
      { url: '/en/guest/reservations', auth: guestSession },
      { url: '/en/guest/profile', auth: guestSession },
      { url: '/en/manage/1', auth: masterSession },
      { url: '/en/manage/1/bookings', auth: masterSession },
      { url: '/en/manage/1/rooms', auth: masterSession },
      { url: '/en/manage/1/plugins', auth: masterSession },
      { url: '/en/manage/1/settings', auth: masterSession },
      { url: '/en/master', auth: masterSession },
      { url: '/en/master/listings', auth: masterSession },
      { url: '/en/master/plugins', auth: masterSession },
      { url: '/en/master/admins', auth: masterSession },
      { url: '/en/master/settings', auth: masterSession },
    ];
    for (const { url, auth } of pagesToCheck) {
      const pageErrors: string[] = [];
      const handler = (msg: any) => {
        if (msg.type() === 'error') pageErrors.push(msg.text());
      };
      page.on('console', handler);
      await page.context().clearCookies();
      if (auth) await applySession(page, auth);
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      for (const err of pageErrors) allConsoleErrors.push({ page: url, text: err });
      page.off('console', handler);
    }
  });
});

test.afterAll(async () => {
  const fs = require('fs');
  const path = require('path');
  const outDir = path.resolve(__dirname, '../../test-results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'frontend-audit.json'),
    JSON.stringify({ results, consoleErrors: allConsoleErrors }, null, 2)
  );
});
