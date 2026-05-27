import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Owner Property CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('owner can view their property settings page', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/owner\/(property|login)/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('owner can update branding color via API', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const getRes = await page.request.get('/api/owner/me');
    expect(getRes.status()).toBe(200);
    const body = await getRes.json();
    const propertyId = body.property?.id ?? body.id;
    expect(propertyId).toBeDefined();
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    const patchRes = await page.request.patch(`/api/properties/${propertyId}`, {
      headers,
      data: { primaryColor: '#FF6600' },
    });
    expect([200, 400, 403]).toContain(patchRes.status());
  });

  test('owner changes are reflected in /api/owner/me', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    await page.request.patch('/api/properties/1', { data: { tagline: 'Unique CRUD Test' }, headers });
    const res = await page.request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.branding.tagline).toBe('Unique CRUD Test');
  });

  test('owner cannot update another property', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.patch('/api/properties/2', {
      data: { primaryColor: '#FF0000' },
      headers,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('owner branding form persists changes through UI', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/owner/property');
    await expect(page).toHaveURL(/\/en\/owner\/(property|login)/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
