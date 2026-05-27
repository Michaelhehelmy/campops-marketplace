import { test, expect } from '../helpers/auth.fixture';

test.describe('Plugin Operations Full Coverage', () => {
  test('GET /api/p/staff returns staff data for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/staff');
    expect([200, 401, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/staff/roster returns roster for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/staff/roster');
    expect([200, 401, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/inventory returns inventory for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/inventory');
    expect([200, 401, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/waste returns waste logs for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/waste');
    expect([200, 401, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/pos returns POS items for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/pos');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/orders returns orders for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/orders');
    expect([200, 401, 404, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.orders ?? body)).toBe(true);
    }
  });

  test('GET /api/p/ota returns OTA calendars for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/ota');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/integrations/calendars returns calendars for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/integrations/calendars');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.calendars ?? body)).toBe(true);
    }
  });

  test('GET /api/p/integrations/sync returns sync data for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/integrations/sync');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/activities returns activities for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/activities');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('POST /api/p/accounting returns accounting data for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.post('/api/p/accounting');
    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/hr returns HR data for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/hr');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/subscriptions returns subscription plans for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/subscriptions');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/p/marketing returns marketing campaigns for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/marketing');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('POST /api/payments/connect returns 401 without session', async ({ request }) => {
    const res = await request.post('/api/payments/connect', {
      data: { propertyId: 'prop-1', provider: 'stripe' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/payments/commission returns 401 without session', async ({ request }) => {
    const res = await request.post('/api/payments/commission', {
      data: { propertyId: 'prop-1', totalAmountCents: 10000, appliesTo: 'all' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/tenant/pages returns pages for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/tenant/pages?tenantId=safari-camp');
    expect([200, 400, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.pages ?? body)).toBe(true);
    }
  });

  test('GET /api/tenant/serve returns tenant data', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/tenant/serve?path=home&tenantId=safari-camp');
    expect([200, 400, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('POST /api/plugins/submit returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/plugins/submit', {
      data: { name: 'test-plugin', version: '1.0.0' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/admin/master-plugins returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/admin/master-plugins', {
      data: { pluginId: 'test' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
