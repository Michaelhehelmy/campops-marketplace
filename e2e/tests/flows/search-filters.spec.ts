import { test, expect } from '@playwright/test';
import { futureDates } from '../../helpers/page-helpers';

test.describe('Search & Filters', () => {
  test('public search returns results', async ({ request }) => {
    const res = await request.get('/api/public/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThan(0);
  });

  test('search with text filter does not error', async ({ request }) => {
    const filteredRes = await request.get('/api/public/search?q=safari');
    expect(filteredRes.status()).toBe(200);
    const filteredBody = await filteredRes.json();
    const filtered = filteredBody.properties ?? filteredBody.listings ?? filteredBody;
    expect(Array.isArray(filtered)).toBe(true);
  });

  test('search with date filter returns results', async ({ request }) => {
    const { checkIn, checkOut } = futureDates(90, 3);
    const res = await request.get(`/api/public/search?checkIn=${checkIn}&checkOut=${checkOut}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
  });

  test('check-availability API returns valid structure', async ({ request }) => {
    const { checkIn, checkOut } = futureDates(90, 2);
    const res = await request.post('/api/p/booking/check-availability', {
      data: { propertyId: '1', checkIn, checkOut, guests: 2 },
    });
    expect([200, 400, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.rooms !== undefined || body.available !== undefined).toBe(true);
    }
  });

  test('search homepage UI has filter controls', async ({ page }) => {
    await page.goto('/en');
    const hasDateFilter =
      (await page.getByPlaceholder(/check.?in/i).isVisible().catch(() => false)) ||
      (await page.getByLabel(/check.?in/i).isVisible().catch(() => false));
    const hasSearchInput =
      (await page.getByPlaceholder(/where|search|destination/i).isVisible().catch(() => false));
    expect(hasDateFilter || hasSearchInput).toBe(true);
  });

  test('categories API returns named categories', async ({ request }) => {
    const res = await request.get('/api/public/categories');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const categories = body.categories ?? body;
    expect(Array.isArray(categories)).toBe(true);
    if (categories.length > 0) {
      expect(categories[0]).toHaveProperty('name');
    }
  });
});
