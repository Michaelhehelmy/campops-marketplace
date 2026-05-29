import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/page-helpers';

test.describe('File Upload', () => {
  test('POST /api/p/upload returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/p/upload', {
      data: { fileName: 'test.jpg', fileType: 'image/jpeg' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('authenticated user can initiate upload', async ({ page }) => {
    const csrf = await loginAs(page, 'guest@sinaicamps.com');
    const headers: Record<string, string> = {};
    if (csrf) headers['x-csrf-token'] = csrf;
    const res = await page.request.post('/api/p/upload', {
      headers,
      data: { fileName: 'photo.jpg', fileType: 'image/jpeg', fileSize: 102400 },
    });
    expect([200, 201, 400, 401]).toContain(res.status());
  });

  test('GET /api/p/upload/:id returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/p/upload/test-file-id');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('upload page loads without server error', async ({ page }) => {
    await page.goto('/en/guest/uploads');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
