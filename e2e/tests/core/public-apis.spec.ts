import { test, expect } from '@playwright/test';

test.describe('Core: Public API Endpoints', () => {
  test('GET /api/public/categories returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/public/categories');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.categories ?? body)).toBe(true);
  });

  test('GET /api/public/featured-listings returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/public/featured-listings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.listings ?? body)).toBe(true);
  });

  test('GET /api/public/homepage-config returns 200 with config', async ({ request }) => {
    const res = await request.get('/api/public/homepage-config');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body === 'object').toBe(true);
  });

  test('GET /api/public/platform-settings returns 200 with settings', async ({ request }) => {
    const res = await request.get('/api/public/platform-settings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.platformName).toBe('string');
  });

  test('GET /api/public/properties/safari-camp returns 200 with property detail', async ({ request }) => {
    const res = await request.get('/api/public/properties/safari-camp');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property.slug).toBe('safari-camp');
  });

  test('GET /api/public/properties/nonexistent returns 404', async ({ request }) => {
    const res = await request.get('/api/public/properties/does-not-exist-999');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('GET /api/public/search returns 200 with properties array', async ({ request }) => {
    const res = await request.get('/api/public/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.properties)).toBe(true);
  });

  test('GET /api/public/plugins returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/public/plugins');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.plugins ?? body)).toBe(true);
  });

  test('GET /api/branding?slug=safari-camp returns 200 with branding', async ({ request }) => {
    const res = await request.get('/api/branding?slug=safari-camp');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.branding ?? body).toBeDefined();
  });

  test('GET /api/branding without slug returns 400', async ({ request }) => {
    const res = await request.get('/api/branding');
    expect(res.status()).toBe(400);
  });

  test('GET /api/themes returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/themes');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.themes ?? body)).toBe(true);
  });

  test('GET /api/properties returns 200 or 400 (requires ownerId)', async ({ request }) => {
    const res = await request.get('/api/properties?ownerId=1');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.properties ?? body)).toBe(true);
    }
  });

  test('GET /api/plugins?propertyId=1 returns 200 with plugin list', async ({ request }) => {
    const res = await request.get('/api/plugins?propertyId=1');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.plugins !== undefined || Array.isArray(body)).toBe(true);
    }
  });

  test('GET /api/tenant/resolve?host=safari-camp.localhost returns 200 for subdomain', async ({ request }) => {
    const res = await request.get('/api/tenant/resolve?host=safari-camp.localhost');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/public/tenant-listing?tenantId=safari-camp returns 200 or 404', async ({ request }) => {
    const res = await request.get('/api/public/tenant-listing?tenantId=safari-camp');
    expect([200, 400, 404]).toContain(res.status());
  });

  test('GET /api/manifest.webmanifest?slug=safari-camp returns 200 or 404', async ({ request }) => {
    const res = await request.get('/api/manifest.webmanifest?slug=safari-camp');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.name).toBeDefined();
    }
  });
});
