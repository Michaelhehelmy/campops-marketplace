import { test, expect, type Page } from '@playwright/test';
import { loginAs, futureDates } from '../../helpers/page-helpers';

test.describe('Payment Failure Scenarios', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  async function signInAndGoToPayment(page: Page) {
    const { checkIn, checkOut } = futureDates(60, 2);
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
    await page.getByRole('link', { name: /Book now/i }).first().click();
    await page.waitForURL(/\/en\/book\/summary/, { timeout: 20000 });
    const nameInput = page.locator('#guestName').or(page.getByLabel(/name/i).first());
    await nameInput.fill('Failure Test Guest');
    const emailInput = page.locator('#guestEmail').or(page.getByLabel(/email/i).first());
    await emailInput.fill('guest@sinaicamps.com');
    await page.getByTestId('continue-to-payment').click();
  }

  async function extractCsrf(res: import('@playwright/test').APIResponse): Promise<string> {
    const raw = res.headers()['set-cookie'] || '';
    const match = raw.match(/x-csrf-token=([^;]+)/);
    return match ? match[1] : '';
  }

  test('Paymob webhook with invalid HMAC returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook?hmac=invalid-hmac-value', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        type: 'TRANSACTION',
        obj: {
          id: 99999, success: true, pending: false, amount_cents: 10000,
          currency: 'EGP', created_at: new Date().toISOString(),
          order: { id: 88888 }, is_void: false, is_refund: false,
          is_auth: false, is_capture: false, is_standalone_payment: true,
          is_3d_secure: false, error_occured: false, has_parent_transaction: false,
          integration_id: 67890, owner: 100,
          source_data: { type: 'card', sub_type: 'Visa', pan: '1234' },
        },
      },
    });
    expect([401, 403]).toContain(res.status());
    if (res.status() === 401) {
      const body = await res.json();
      expect(body.error).toMatch(/hmac|signature|invalid/i);
    }
  });

  test('Paymob webhook with missing HMAC returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/webhook', {
      headers: { 'Content-Type': 'application/json' },
      data: { type: 'TRANSACTION', obj: { id: 1 } },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('create-payment without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/create-payment', {
      data: { bookingId: 'b-1', amountCents: 10000, billingData: { email: 'x@x.com' } },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('refund without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/p/paymob/refund', {
      data: { transactionId: '12345', amountCents: 5000 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('refund as guest (wrong role) returns 403', async ({ page }) => {
    const signInRes = await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000' },
      data: { email: 'guest@sinaicamps.com', password: 'password123' },
    });
    const csrf = await extractCsrf(signInRes);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.post('/api/p/paymob/refund', {
      data: { transactionId: '12345', amountCents: 5000 },
      headers,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('return route with missing transaction ID returns 400', async ({ request }) => {
    const res = await request.get('/api/p/paymob/return');
    expect(res.status()).toBe(400);
  });

  test('pay-later booking flow page loads correctly', async ({ page }) => {
    const { checkIn, checkOut } = futureDates(45, 2);
    await loginAs(page, 'guest@sinaicamps.com');
    await page.goto(`/en/book/summary?checkIn=${checkIn}&checkOut=${checkOut}&propertyId=1`);
    await expect(page).toHaveURL(/\/en\/book\/summary/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
