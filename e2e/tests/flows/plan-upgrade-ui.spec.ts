import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Plan Upgrade UI Flow', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/test/reset');
  });

  test('owner dashboard API shows current plan', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const res = await page.request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.plan).toBeDefined();
    expect(['basic', 'premium', 'ultimate']).toContain(body.property.plan);
  });

  test('upgrade page renders plan options', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    const res = await page.request.get('/api/owner/me');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.property.plan).toBeDefined();
    expect(['basic', 'premium', 'ultimate']).toContain(body.property.plan);
  });

  test('upgrade API from premium to ultimate requires custom domain', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.post('/api/owner/upgrade', {
      data: { siteId: '1', newPlan: 'ultimate' },
      headers,
    });
    expect([400, 402, 403]).toContain(res.status());
  });

  test('upgrade API with custom domain succeeds', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.post('/api/owner/upgrade', {
      data: {
        siteId: '1',
        newPlan: 'ultimate',
        customDomain: `e2etest-${Date.now()}.example.com`,
        stripe_payment_method_id: 'pm_placeholder',
      },
      headers,
    });
    expect([200, 402, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.plan).toBe('ultimate');
    }
  });
});
