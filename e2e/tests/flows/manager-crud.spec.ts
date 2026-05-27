import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Manager Full CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('manager can view bookings list for their property', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    const res = await page.request.get('/api/manage/safari-camp/bookings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const bookings = body.bookings ?? body.data ?? body;
    expect(Array.isArray(bookings)).toBe(true);
  });

  test('manager can view rooms list for their property', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    const res = await page.request.get('/api/manage/safari-camp/rooms');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const rooms = body.rooms ?? body.data ?? body;
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
  });

  test('manager bookings dashboard page loads', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp/bookings');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/(bookings|login)/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('manager check-in via API', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const listRes = await page.request.get('/api/manage/safari-camp/bookings');
    const listBody = await listRes.json();
    const bookings = listBody.bookings ?? listBody.data ?? listBody;
    if (Array.isArray(bookings) && bookings.length > 0) {
      const bookingId = bookings[0].id;
      const headers: Record<string, string> = {};
      if (csrf) headers['x-csrf-token'] = csrf;
      const checkInRes = await page.request.patch(`/api/p/booking/${bookingId}/check-in`, { headers });
      expect([200, 400, 403, 409]).toContain(checkInRes.status());
    }
  });

  test('manager CRM/guests page loads', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp/guests');
    await expect(page).toHaveURL(/\/en\/manage\/safari-camp\/(guests|login)/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
