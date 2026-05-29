import { test, expect } from '@playwright/test';

test.describe('Plan Enforcement & Branding', () => {
  test.beforeAll(async ({ request }) => {
    // Reset database to clean seed state
    const reset = await request.post('http://localhost:3000/api/test/reset');
    expect(reset.ok()).toBeTruthy();
  });

  async function signIn(request: import('@playwright/test').APIRequestContext, email: string) {
    const res = await request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: { email, password: 'password123' },
    });
    expect(res.ok()).toBeTruthy();
    return res;
  }

  function extractCsrf(res: import('@playwright/test').APIResponse): string {
    const raw = res.headers()['set-cookie'] || '';
    const match = raw.match(/x-csrf-token=([^;]+)/);
    return match ? match[1] : '';
  }

  async function authHeaders(
    request: import('@playwright/test').APIRequestContext,
    email: string
  ): Promise<Record<string, string>> {
    const res = await signIn(request, email);
    const csrf = extractCsrf(res);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    return headers;
  }

  /* ── Tenant Resolution by Plan ────────────────────────────── */

  test('Basic tenant is blocked from subdomain resolution', async ({ request }) => {
    const res = await request.get('/api/tenant/resolve?host=mountain-lodge.localhost');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.property).toBeNull();
  });

  test('Premium tenant can be resolved via subdomain', async ({ request }) => {
    const res = await request.get('/api/tenant/resolve?host=safari-camp.localhost');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property).toBeDefined();
    expect(body.property.slug).toBe('safari-camp');
  });

  test('Ultimate tenant can be resolved via custom domain', async ({ request }) => {
    const res = await request.get('/api/tenant/resolve?host=acaciacamp.com');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property).toBeDefined();
    expect(body.property.plan).toBe('ultimate');
    expect(body.property.slug).toBe('acacia');
  });

  /* ── Domain Check API ────────────────────────────────────── */

  test('Domain check API requires authentication', async ({ request }) => {
    const res = await request.get('/api/owner/domains/check?domain=bookings.example.com');
    expect(res.status()).toBe(401);
  });

  test('Domain check API rejects non-Ultimate plan', async ({ request }) => {
    await signIn(request, 'safari@sinaicamps.com');
    const res = await request.get('/api/owner/domains/check?domain=bookings.example.com');
    expect(res.status()).toBe(403);
  });

  test('Domain check API validates domain format', async ({ request }) => {
    await signIn(request, 'acacia@acaciacamp.com');
    const res = await request.get('/api/owner/domains/check?domain=bookings.example.com');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('available');
    expect(typeof body.available).toBe('boolean');
  });

  /* ── Upgrade API ─────────────────────────────────────────── */

  test('Upgrade API requires authentication', async ({ request }) => {
    const res = await request.post('/api/owner/upgrade', {
      data: { siteId: '2', newPlan: 'premium', subdomain: 'mountain-lodge' },
    });
    expect(res.status()).toBe(401);
  });

  test('Upgrade API rejects invalid plan', async ({ request }) => {
    const headers = await authHeaders(request, 'safari@sinaicamps.com');
    const res = await request.post('/api/owner/upgrade', {
      headers,
      data: { siteId: '1', newPlan: 'basic' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot downgrade plan/i);
  });

  test('Upgrade API allows premium→ultimate for correct site', async ({ request }) => {
    const headers = await authHeaders(request, 'safari@sinaicamps.com');
    const res = await request.post('/api/owner/upgrade', {
      headers,
      data: { siteId: '1', newPlan: 'ultimate', customDomain: 'safari-booking.com', stripe_payment_method_id: 'pm_test' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe('ultimate');
  });

  test('Upgrade API rejects duplicate custom domain', async ({ request }) => {
    const headers = await authHeaders(request, 'admin@sinaicamps.com');
    const res = await request.post('/api/owner/upgrade', {
      headers,
      data: { siteId: '2', newPlan: 'ultimate', customDomain: 'acaciacamp.com', stripe_payment_method_id: 'pm_test' },
    });
    expect(res.status()).toBe(409);
  });

  /* ── Owner/Me API ────────────────────────────────────────── */

  test('Owner/me returns branding and settings for authenticated user', async ({ request }) => {
    await signIn(request, 'safari@sinaicamps.com');
    const res = await request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property).toBeDefined();
    expect(body.property).toHaveProperty('branding');
    expect(body.property).toHaveProperty('settings');
    expect(body.property).toHaveProperty('subdomain');
    expect(body.property).toHaveProperty('customDomain');
    expect(body.property).toHaveProperty('domainVerified');
  });

  /* ── Properties PATCH API ────────────────────────────────── */

  test('Properties PATCH requires authentication', async ({ request }) => {
    const res = await request.patch('/api/properties/1', {
      data: { name: 'Unauthorized Update' },
    });
    expect(res.status()).toBe(401);
  });

  test('Properties PATCH saves branding fields', async ({ request }) => {
    const headers = await authHeaders(request, 'safari@sinaicamps.com');
    const res = await request.patch('/api/properties/1', {
      headers,
      data: {
        primaryColor: '#FF5733',
        tagline: 'Test tagline',
        contactEmail: 'test@safaricamp.com',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.branding).toBeDefined();
    expect(body.branding.primaryColor).toBe('#FF5733');
    expect(body.branding.tagline).toBe('Test tagline');
    expect(body.branding.contactEmail).toBe('test@safaricamp.com');
  });

  test('Owner/me returns updated branding after save', async ({ request }) => {
    await signIn(request, 'safari@sinaicamps.com');
    const res = await request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.branding).toBeDefined();
    expect(body.property.branding.primaryColor).toBe('#FF5733');
  });

  /* ── Owner Property Page ─────────────────────────────────── */

  test('Owner property page loads with branding form', async ({ page, context }) => {
    const signInRes = await context.request.post('http://localhost:3000/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: { email: 'safari@sinaicamps.com', password: 'password123' },
    });
    expect(signInRes.ok()).toBeTruthy();

    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/owner\/property/);
    await expect(page.getByRole('heading', { name: /Branding/i })).toBeVisible();
    await expect(page.locator('input[type="color"]').first()).toBeVisible();
  });
});
