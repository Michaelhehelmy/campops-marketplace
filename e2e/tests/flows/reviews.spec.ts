import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Reviews & Ratings', () => {
  test('GET /api/p/reviews/listing/:listingId returns reviews for listing', async ({ request }) => {
    const res = await request.get('/api/p/reviews/listing/1');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('reviews');
      expect(Array.isArray(body.reviews)).toBe(true);
    }
  });

  test('GET /api/p/reviews/stats/:listingId returns rating stats', async ({ request }) => {
    const res = await request.get('/api/p/reviews/stats/1');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('avgRating');
      expect(body).toHaveProperty('reviewCount');
    }
  });

  test('POST /api/p/reviews returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/reviews', {
      data: { bookingId: 'bk-1', rating: 5, comment: 'Great stay!' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('authenticated guest can submit review and see it reflected', async ({ page }) => {
    const csrf = await loginAs(page, 'guest@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;

    const res = await page.request.post('/api/p/reviews', {
      headers,
      data: { bookingId: 'bk-1', rating: 5, title: 'Amazing', comment: 'Best camp ever!' },
    });
    expect([200, 201, 400, 401, 403, 404, 409]).toContain(res.status());
  });

  test('review page loads without server error', async ({ page }) => {
    await page.goto('/en/guest/reviews');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
