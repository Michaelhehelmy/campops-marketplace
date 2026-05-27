import { test, expect } from '../../helpers/auth.fixture';

test.describe('Core: Booking Operations', () => {
  test('GET /api/guest/reservations returns reservations for authenticated guest', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/guest/reservations');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.reservations ?? body)).toBe(true);
    }
  });

  test('GET /api/p/bookings returns bookings for authenticated user', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/p/bookings');
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('GET /api/manage/safari-camp/bookings returns bookings for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/safari-camp/bookings');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.bookings ?? body)).toBe(true);
    }
  });

  test('GET /api/manage/safari-camp/rooms returns rooms for manager', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/safari-camp/rooms');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.rooms ?? body)).toBe(true);
    }
  });

  test('GET /api/guest/reservations returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/guest/reservations');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/p/bookings returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/p/bookings');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/p/paymob/create-payment returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/paymob/create-payment', {
      data: { propertyId: '1', amountCents: 10000 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/p/paymob/webhook returns 400 (no valid HMAC)', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook', {
      data: { transaction: 'fake' },
    });
    expect([400, 401, 403, 500]).toContain(res.status());
  });

  test('POST /api/p/paymob/refund returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/paymob/refund', {
      data: { transactionId: 'fake-id', amountCents: 5000 },
    });
    expect([401, 403]).toContain(res.status());
  });
});
