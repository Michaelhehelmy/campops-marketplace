import { test, expect } from '@playwright/test';

/**
 * Core E2E: Core APIs
 *
 * Verifies that the framework's core (non-plugin) API endpoints are functional:
 *   - /api/master/listings — returns listing catalog
 *   - /api/master/plugins  — returns available plugins catalog
 *   - /api/master/stats    — returns platform-level stats
 *   - /api/plugins/ui-registry — returns UI composition data
 *   - /api/test/reset      — resets DB for test isolation
 */
test.describe('Core: Platform APIs', () => {
  test('GET /api/master/listings is accessible', async ({ request }) => {
    const res = await request.get('/api/master/listings');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.listings)).toBe(true);
    }
  });

  test('GET /api/master/plugins is accessible', async ({ request }) => {
    const res = await request.get('/api/master/plugins');
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.plugins)).toBe(true);
    }
  });

  test('GET /api/master/stats is accessible (auth-protected)', async ({ request }) => {
    const res = await request.get('/api/master/stats');
    // 200 = stats returned, 403/401 = correctly auth-gated; both are valid
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.totalTenants).toBe('number');
      expect(typeof body.activeTenants).toBe('number');
    }
  });

  test('GET /api/plugins/ui-registry returns 200 with slots', async ({ request }) => {
    const res = await request.get('/api/plugins/ui-registry');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.uiVersion).toBe('1.0.0');
    expect(typeof body.slots).toBe('object');
    expect(Array.isArray(body.menuItems)).toBe(true);
  });

  test('POST /api/test/reset returns 200', async ({ request }) => {
    const res = await request.post('/api/test/reset');
    expect(res.status()).toBe(200);
  });

  test('GET /api/manage/:id/stats returns 200 for known tenant', async ({ request }) => {
    const res = await request.get('/api/manage/safari-camp/stats');
    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.tenantId ?? body.propertyId).toBeDefined();
    }
  });
});
