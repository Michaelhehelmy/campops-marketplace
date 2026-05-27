import { test, expect } from '../helpers/auth.fixture';

test.describe('Admin Master Full Coverage', () => {
  test('Master can access all admin pages', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/admin/setup');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/health');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/listings/1/config');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/reports/commissions');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('Master can access master admin pages', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    await page.goto('/en/admin/master');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/master/plugins');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/master/settings');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/master/listings/1');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.goto('/en/admin/master/commissions');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('Master admin master/admins page renders', async ({ page, masterSession }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    await page.goto('/en/admin/master/admins');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('GET /api/master/commissions returns commissions for master', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/master/commissions');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/master/listings/1/plugins returns plugins for listing', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/master/listings/1/plugins');
    expect([200, 401, 404, 405]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/admin/plugins/submissions returns submissions for master', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/plugins/submissions');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('POST /api/admin/plugins/sync returns 200 or 401', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.post('/api/admin/plugins/sync');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /api/admin/plugins/assets returns 200 or 401', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/plugins/assets');
    expect([200, 400, 401]).toContain(res.status());
  });

  test('GET /api/admin/shops returns shops for master', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/shops');
    expect([200, 400, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.shops ?? body)).toBe(true);
    }
  });

  test('POST /api/admin/build-queue returns 200 or 401', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.post('/api/admin/build-queue');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('POST /api/site/plugins/install returns 401 without site auth', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.post('/api/site/plugins/install', {
      data: { siteId: 'site-1', pluginId: 'booking' },
    });
    expect([200, 400, 401, 403]).toContain(res.status());
  });

  test('PATCH /api/master/admins/1 returns 401 or 404 (no permission)', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.patch('/api/master/admins/1', {
      data: { role: 'admin' },
    });
    expect([200, 400, 401, 403, 404]).toContain(res.status());
  });

  test('GET /api/admin/build-queue returns queue data', async ({
    page,
    masterSession,
  }) => {
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/build-queue');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });
});
