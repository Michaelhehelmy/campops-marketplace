import { test, expect } from '@playwright/test';
import { futureDates } from '../../helpers/page-helpers';

test.describe('Search Advanced', () => {
  test('search with price range filter returns filtered results', async ({ request }) => {
    const res = await request.get('/api/public/search?minPrice=50&maxPrice=500');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
  });

  test('search with category filter returns results', async ({ request }) => {
    const res = await request.get('/api/public/search?category=camp');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
  });

  test('search with guest count filter returns results', async ({ request }) => {
    const res = await request.get('/api/public/search?adults=4');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
  });

  test('search pagination returns correct structure', async ({ request }) => {
    const res = await request.get('/api/public/search?page=2&limit=12');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalPages');
    expect(body).toHaveProperty('page');
    expect(body.page).toBe(2);
  });

  test('search with all filters combined does not error', async ({ request }) => {
    const { checkIn, checkOut } = futureDates(90, 3);
    const res = await request.get(
      `/api/public/search?q=sinai&checkIn=${checkIn}&checkOut=${checkOut}&adults=2&category=camp&minPrice=50&maxPrice=1000`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('properties');
  });

  test('search with empty query returns all active properties', async ({ request }) => {
    const res = await request.get('/api/public/search?q=');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const properties = body.properties ?? body.listings ?? body;
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThan(0);
  });
});
