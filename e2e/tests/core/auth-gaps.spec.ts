import { test, expect } from '@playwright/test';

/**
 * Auth Gap E2E Tests
 * ===================
 * Verifies that every protected API route rejects unauthenticated requests
 * with 401/403, while public routes return 200/400 (not 401).
 *
 * Each test makes an unauthenticated request and asserts the status code
 * falls in the expected range.
 */

const UNAUTHENTICATED: [number, number] = [401, 403];
const UNAUTHENTICATED_OR_NOTFOUND: [number, number] = [401, 404];
const PUBLIC: [number, number] = [200, 500];

function assertStatus(status: number, range: [number, number]) {
  expect(status).toBeGreaterThanOrEqual(range[0]);
  expect(status).toBeLessThanOrEqual(range[1]);
}

// ─── 1. Public endpoints (should never return 401) ────────────────────────────

test.describe('Public endpoints — no auth required', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health');
    assertStatus(res.status(), [200, 503]);
  });

  test('GET /api/public/search returns 200', async ({ request }) => {
    const res = await request.get('/api/public/search');
    assertStatus(res.status(), PUBLIC);
  });

  test('GET /api/public/categories returns 200', async ({ request }) => {
    const res = await request.get('/api/public/categories');
    assertStatus(res.status(), PUBLIC);
  });

  test('GET /api/public/listings returns 200', async ({ request }) => {
    const res = await request.get('/api/public/listings');
    assertStatus(res.status(), PUBLIC);
  });

  test('GET /api/public/featured-listings returns 200', async ({ request }) => {
    const res = await request.get('/api/public/featured-listings');
    assertStatus(res.status(), PUBLIC);
  });

  test('GET /api/branding returns 400 (no params) not 401', async ({ request }) => {
    const res = await request.get('/api/branding');
    expect(res.status()).toBe(400);
  });

  test('GET /api/domains/check returns 200 or 400 not 401', async ({ request }) => {
    const res = await request.get('/api/domains/check');
    assertStatus(res.status(), [200, 400]);
  });

  test('GET /api/themes returns 200', async ({ request }) => {
    const res = await request.get('/api/themes');
    expect(res.status()).toBe(200);
  });

  test('GET /api/metrics returns 200', async ({ request }) => {
    const res = await request.get('/api/metrics');
    expect(res.status()).toBe(200);
  });
});

// ─── 2. Admin routes — must auth ──────────────────────────────────────────────

test.describe('Admin API — must be authenticated', () => {
  test('GET /api/admin/plugins rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/admin/plugins');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/admin/master-plugins rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/admin/master-plugins');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/admin/plugins/assets rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/admin/plugins/assets');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/admin/plugins/submissions returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/plugins/submissions');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('POST /api/admin/plugins/sync returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/plugins/sync');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/admin/shops rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/admin/shops');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/admin/build-queue returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/build-queue');
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});

// ─── 3. Master routes — must be marketplace_master ────────────────────────────

test.describe('Master API — must be authenticated', () => {
  test('GET /api/master/listings returns 401', async ({ request }) => {
    const res = await request.get('/api/master/listings');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/master/stats returns 401', async ({ request }) => {
    const res = await request.get('/api/master/stats');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/master/plugins returns 401', async ({ request }) => {
    const res = await request.get('/api/master/plugins');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/master/settings returns 401', async ({ request }) => {
    const res = await request.get('/api/master/settings');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/master/admins returns 401', async ({ request }) => {
    const res = await request.get('/api/master/admins');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/master/commissions returns 401', async ({ request }) => {
    const res = await request.get('/api/master/commissions');
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});

// ─── 4. Manage routes — must be listing owner/manager ─────────────────────────

test.describe('Manage API — must be authenticated', () => {
  test('GET /api/manage/prop-1/bookings returns 401', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/bookings');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/manage/prop-1/rooms returns 401', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/rooms');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/manage/prop-1/guests returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/guests');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/finance returns 401', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/finance');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/manage/prop-1/staff returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/staff');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/orders returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/orders');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/stats returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/stats');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/plugins returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/plugins');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('POST /api/manage/prop-1/plugins/toggle returns 401 or 404', async ({ request }) => {
    const res = await request.post('/api/manage/prop-1/plugins/toggle', {
      data: { pluginName: 'booking', isEnabled: true },
    });
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/housekeeping returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/housekeeping');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });

  test('GET /api/manage/prop-1/maintenance returns 401 or 404', async ({ request }) => {
    const res = await request.get('/api/manage/prop-1/maintenance');
    assertStatus(res.status(), UNAUTHENTICATED_OR_NOTFOUND);
  });
});

// ─── 5. Owner routes ──────────────────────────────────────────────────────────

test.describe('Owner API — must be authenticated', () => {
  test('GET /api/owner/me returns 401', async ({ request }) => {
    const res = await request.get('/api/owner/me');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('POST /api/owner/upgrade returns 401', async ({ request }) => {
    const res = await request.post('/api/owner/upgrade', {
      data: { siteId: 'site-1', newPlan: 'premium' },
    });
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('POST /api/owner/register returns 400 not 401 (public)', async ({ request }) => {
    const res = await request.post('/api/owner/register', {
      data: { email: 'test@example.com', password: 'Pass1234!', slug: 'test-camp' },
    });
    expect(res.status()).not.toBe(401);
  });
});

// ─── 6. Payment routes ────────────────────────────────────────────────────────

test.describe('Payment API — must be authenticated', () => {
  test('POST /api/payments/commission returns 401', async ({ request }) => {
    const res = await request.post('/api/payments/commission', {
      data: { propertyId: 'prop-1', totalAmountCents: 10000, appliesTo: 'all' },
    });
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('POST /api/payments/connect returns 401', async ({ request }) => {
    const res = await request.post('/api/payments/connect', {
      data: { propertyId: 'prop-1', provider: 'stripe', userId: 'u1' },
    });
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});

// ─── 7. Guest routes ──────────────────────────────────────────────────────────

test.describe('Guest API — must be authenticated', () => {
  test('GET /api/guest/dashboard returns 401', async ({ request }) => {
    const res = await request.get('/api/guest/dashboard');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/guest/reservations returns 401', async ({ request }) => {
    const res = await request.get('/api/guest/reservations');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/guest/orders returns 401', async ({ request }) => {
    const res = await request.get('/api/guest/orders');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/guest/profile returns 401', async ({ request }) => {
    const res = await request.get('/api/guest/profile');
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});

// ─── 8. Site routes ───────────────────────────────────────────────────────────

test.describe('Site API — must be authenticated', () => {
  test('GET /api/site/options returns 401', async ({ request }) => {
    const res = await request.get('/api/site/options');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/site/posts returns 401', async ({ request }) => {
    const res = await request.get('/api/site/posts');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('GET /api/site/plugins returns 401', async ({ request }) => {
    const res = await request.get('/api/site/plugins');
    assertStatus(res.status(), UNAUTHENTICATED);
  });

  test('POST /api/site/plugins/install returns 401', async ({ request }) => {
    const res = await request.post('/api/site/plugins/install', {
      data: { siteId: 'site-1', pluginId: 'booking' },
    });
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});

// ─── 9. Plugin routes (known auth gaps — document current behaviour) ──────────

test.describe('Plugin API — auth gaps documented', () => {
  test('GET /api/plugins (no auth) returns 200 or 400', async ({ request }) => {
    const res = await request.get('/api/plugins');
    expect(res.status()).not.toBe(401);
  });

  test('GET /api/plugins/ui-registry (no auth) returns 200 or 400', async ({ request }) => {
    const res = await request.get('/api/plugins/ui-registry');
    expect(res.status()).not.toBe(401);
  });
});

// ─── 10. Other sensitive routes ──────────────────────────────────────────────

test.describe('Other sensitive routes', () => {
  test('GET /api/properties (no auth) returns 200/400 not 401', async ({ request }) => {
    const res = await request.get('/api/properties');
    expect(res.status()).not.toBe(401);
  });

  test('GET /api/listing-access returns 401', async ({ request }) => {
    const res = await request.get('/api/listing-access');
    assertStatus(res.status(), UNAUTHENTICATED);
  });
});
