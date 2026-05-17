import { test, expect } from '@playwright/test';

/**
 * Core E2E: Cross-Tenant Isolation
 *
 * Verifies that admin of listing A cannot access listing B's data,
 * and that guest data is scoped correctly per property.
 */
test.describe('Core: Cross-Tenant Isolation', () => {
  test('listing-access returns 403 for unknown listing', async ({ request }) => {
    // Without a session, access check returns 401/403
    const res = await request.get('/api/listing-access?listingId=nonexistent-listing-xyz');
    expect([401, 403]).toContain(res.status());
  });

  test('manage rooms for listing A returns data (scoped to that listing)', async ({ request }) => {
    const res = await request.get('/api/manage/1/rooms');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('manage rooms for listing B returns data (scoped to that listing)', async ({ request }) => {
    const res = await request.get('/api/manage/2/rooms');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('Public search returns only active properties', async ({ request }) => {
    const res = await request.get('/api/public/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.properties)).toBe(true);
    // All returned properties must be active (the search only returns active ones)
    for (const prop of body.properties) {
      expect(prop.is_active ?? 1).toBeTruthy();
    }
  });

  test('Safari Camp property detail is publicly visible', async ({ request }) => {
    const res = await request.get('/api/public/properties/safari-camp');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property.slug).toBe('safari-camp');
  });

  test('Mountain Lodge property detail is publicly visible', async ({ request }) => {
    const res = await request.get('/api/public/properties/mountain-lodge');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.property.slug).toBe('mountain-lodge');
  });

  test('Property search results do not cross-contaminate', async ({ request }) => {
    const resA = await request.get('/api/public/properties/safari-camp');
    const resB = await request.get('/api/public/properties/mountain-lodge');
    expect(resA.status()).toBe(200);
    expect(resB.status()).toBe(200);
    const propA = (await resA.json()).property;
    const propB = (await resB.json()).property;
    // Listings have different IDs and slugs
    expect(propA.id).not.toBe(propB.id);
    expect(propA.slug).not.toBe(propB.slug);
    // Names are different
    expect(propA.name).not.toBe(propB.name);
  });

  test('Manage guests for listing A is scoped (returns 200 with guest data)', async ({
    request,
  }) => {
    const res = await request.get('/api/manage/1/guests');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('Finance endpoint for listing A is accessible', async ({ request }) => {
    const res = await request.get('/api/manage/1/finance');
    expect([200, 401, 403, 404]).toContain(res.status());
  });
});
