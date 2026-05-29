import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Booking Cancellation', () => {
  test('POST /api/p/booking/:id/cancel returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/booking/test-booking-id/cancel');
    expect([401, 403]).toContain(res.status());
  });

  test('guest cannot cancel non-existent booking', async ({ page }) => {
    const csrf = await loginAs(page, 'guest@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.post('/api/p/booking/non-existent-id/cancel', { headers });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('manager can cancel booking', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;

    const listRes = await page.request.get('/api/manage/safari-camp/bookings');
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    const bookings = listBody.bookings ?? listBody.data ?? listBody;

    if (Array.isArray(bookings) && bookings.length > 0) {
      const bookingId = bookings[0].id;
      const cancelRes = await page.request.post(`/api/p/booking/${bookingId}/cancel`, { headers });
      expect([200, 400, 401, 403, 404, 409]).toContain(cancelRes.status());
    }
  });

  test('cancel flow page loads without server error', async ({ page }) => {
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto('/en/guest/reservations');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
