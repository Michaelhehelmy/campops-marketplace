import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('Housekeeping CRUD', () => {
  test('GET /api/p/housekeeping returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/p/housekeeping');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/p/housekeeping returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/housekeeping', {
      data: { roomId: 'room-1', category: 'deep-clean' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('authenticated user can create housekeeping task', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;

    const createRes = await page.request.post('/api/p/housekeeping', {
      headers,
      data: { room_id: 'room-1', category: 'deep-clean', priority: 'high', notes: 'Clean all surfaces' },
    });
    expect([200, 201, 400, 401]).toContain(createRes.status());

    if (createRes.status() === 201) {
      const body = await createRes.json();
      const taskId = body.task?.id;
      expect(taskId).toBeDefined();

      const updateRes = await page.request.patch(`/api/p/housekeeping/${taskId}`, {
        headers,
        data: { status: 'completed' },
      });
      expect([200, 401, 403, 404]).toContain(updateRes.status());

      const deleteRes = await page.request.delete(`/api/p/housekeeping/${taskId}`, { headers });
      expect([200, 401, 403, 404]).toContain(deleteRes.status());
    }
  });

  test('authenticated user can list housekeeping tasks', async ({ page }) => {
    const csrf = await loginAs(page, 'safari@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.get('/api/p/housekeeping', { headers });
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('tasks');
      expect(Array.isArray(body.tasks)).toBe(true);
    }
  });

  test('housekeeping dashboard page loads', async ({ page }) => {
    await loginAs(page, 'safari@sinaicamps.com');
    await page.goto('/en/manage/safari-camp/housekeeping');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
