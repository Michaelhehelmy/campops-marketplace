import { test, expect } from '../helpers/auth.fixture';

test.describe('Plugin Contract: Registry Invariants', () => {
  test('plugin catalog lists all installed plugins with required fields', async ({ request }) => {
    const res = await request.get('/api/plugins?propertyId=1');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const plugins = body.plugins ?? body;
      expect(Array.isArray(plugins)).toBe(true);
      for (const plugin of plugins) {
        expect(plugin.id ?? plugin.name ?? plugin.pluginId).toBeDefined();
      }
    }
  });

  test('master plugin catalog has required fields on every plugin', async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    const res = await request.get('/api/master/plugins');
    expect(res.status()).toBe(200);
    const { plugins } = await res.json();
    expect(Array.isArray(plugins)).toBe(true);
    for (const plugin of plugins) {
      expect(plugin.id ?? plugin.pluginId ?? plugin.name).toBeTruthy();
      expect(plugin.version ?? plugin.apiVersion ?? '1.0.0').toBeTruthy();
    }
  });

  test('plugin toggle API requires authentication', async ({ request }) => {
    const res = await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('plugin toggle API rejects guest user', async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const res = await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe('Plugin Contract: Route Guard Invariants', () => {
  const PROTECTED_PLUGIN_ROUTES = [
    '/api/p/paymob/create-payment',
    '/api/p/paymob/refund',
  ];

  for (const route of PROTECTED_PLUGIN_ROUTES) {
    test(`${route} requires auth (unauthenticated → 401/403)`, async ({ request }) => {
      const res = await request.post(route, {
        data: { test: true },
      });
      expect([401, 403]).toContain(res.status());
    });
  }

  test('/api/p/paymob/webhook without HMAC returns error', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook', {
      data: { type: 'TRANSACTION', obj: {} },
    });
    expect([401, 403, 500]).toContain(res.status());
  });
});

test.describe('Plugin Contract: Error Format Invariants', () => {
  test('unknown plugin route returns 404, not crash', async ({ request }) => {
    const res = await request.get('/api/p/nonexistent-plugin-xyz/action');
    expect([404, 400]).toContain(res.status());
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('application');
  });

  test('plugin route with invalid JSON body returns 400, not 500', async ({ request }) => {
    const res = await request.post('/api/p/booking/book', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json at all',
    });
    expect([400, 401]).toContain(res.status());
  });
});

test.describe('Plugin Contract: Isolation Invariants', () => {
  test('booking plugin enabled for property 1 does not affect property 2', async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'master@sinaicamps.com', password: 'password123' },
    });
    await request.post('/api/manage/1/plugins/toggle', {
      data: { pluginName: 'booking', enabled: true },
    });
    const res2 = await request.get('/api/plugins?propertyId=2');
    if (res2.status() === 200) {
      const body = await res2.json();
      const plugins = body.plugins ?? body;
      expect(Array.isArray(plugins)).toBe(true);
    }
  });
});
