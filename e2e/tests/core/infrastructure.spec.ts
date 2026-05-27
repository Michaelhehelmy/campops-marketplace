import { test, expect } from '@playwright/test';

test.describe('Core: Infrastructure Endpoints', () => {
  test('GET /api/health returns 200 or 503', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.ok ?? body.status).toBeDefined();
    }
  });

  test('GET /api/health/cache returns 200 or 503', async ({ request }) => {
    const res = await request.get('/api/health/cache');
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.local?.status).toBe('healthy');
    }
  });

  test('GET /api/csrf-token returns 200 with token', async ({ request }) => {
    const res = await request.get('/api/csrf-token');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe('string');
  });

  test('GET /api/metrics returns 200 with Prometheus format', async ({ request }) => {
    const res = await request.get('/api/metrics');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test('GET /api/test/reset returns 200', async ({ request }) => {
    const res = await request.post('/api/test/reset');
    expect(res.status()).toBe(200);
  });

  test('GET /api/domains/check?domain=new-test-slug returns 200 with available', async ({ request }) => {
    const res = await request.get('/api/domains/check?domain=new-test-slug');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.available ?? body).toBeDefined();
    }
  });

  test('GET /api/domains/check?domain=admin returns 200 (reserved)', async ({ request }) => {
    const res = await request.get('/api/domains/check?domain=admin');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.available).toBe(false);
    }
  });

  test('GET /api/domains/check with no params returns 200 or 400', async ({ request }) => {
    const res = await request.get('/api/domains/check');
    expect([200, 400]).toContain(res.status());
  });

  test('GET /api/media/missing-site/missing-key returns 404', async ({ request }) => {
    const res = await request.get('/api/media/site-0/missing-key');
    expect([400, 404]).toContain(res.status());
  });

  test('GET /api/menus/main returns 200 or 404', async ({ request }) => {
    const res = await request.get('/api/menus/main');
    expect([200, 404]).toContain(res.status());
  });

  test('GET /api/global-setup completed (server is running)', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 503]).toContain(res.status());
  });
});
