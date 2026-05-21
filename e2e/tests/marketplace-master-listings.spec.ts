import { test, expect } from '../helpers/auth.fixture';
import { MasterListingsPage } from '../pages/MasterListingsPage';

test.describe('Master Listings Management', () => {
  test('Master can view all listings', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);

    const listingsPage = new MasterListingsPage(page);
    await listingsPage.goto();

    await expect(listingsPage.listingsTable).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: /Safari Camp/i })).toBeVisible();
  });

  test('Master can create a new listing via API', async ({ request, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    const cookies = state.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    const csrfCookie = state.cookies.find((c: any) => c.name === 'x-csrf-token');
    const csrfToken = csrfCookie?.value || '';

    const uniqueSlug = `test-camp-${Date.now()}`;
    const res = await request.post('http://localhost:3000/api/master/listings', {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      data: { name: `Test Camp ${Date.now()}`, slug: uniqueSlug },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe(uniqueSlug);
    expect(body.ok).toBe(true);
  });

  test('Master can navigate to listing detail page', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);

    const listingsPage = new MasterListingsPage(page);
    await listingsPage.goto();

    await listingsPage.clickManage('Safari Camp');
    await expect(page).toHaveURL(/\/admin\/listings\/1/);
    await expect(page.getByText(/Safari Camp/i).first()).toBeVisible();
  });

  test('Master can toggle plugin for a specific listing', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);

    await page.goto('/en/admin/listings/1');
    await page.getByRole('tab', { name: /Plugins/i }).click();
    await expect(page.getByText(/Listing Plugins/i)).toBeVisible();

    const bookingToggle = page.getByRole('checkbox', { name: /booking/i });
    await expect(bookingToggle).toBeVisible({ timeout: 8000 });

    const wasChecked = await bookingToggle.isChecked();
    await bookingToggle.click();
    await page.waitForResponse(
      (res) =>
        res.url().includes('/listings/') && res.url().includes('/plugins') && res.status() === 200
    );

    const isNowChecked = await bookingToggle.isChecked();
    expect(isNowChecked).toBe(!wasChecked);

    await bookingToggle.click();
    await page.waitForResponse(
      (res) =>
        res.url().includes('/listings/') && res.url().includes('/plugins') && res.status() === 200
    );
    expect(await bookingToggle.isChecked()).toBe(wasChecked);
  });

  test('Master can toggle listing activation status', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);

    await page.goto('/en/admin/listings');
    const row = page.getByRole('row').filter({ hasText: /Safari Camp/i });
    await expect(row.getByText(/active/i)).toBeVisible();
  });

  test('Listing detail page shows plugin toggles', async ({ page, masterSession }) => {
    const state = JSON.parse(masterSession.storageState);
    await page.context().addCookies(state.cookies);

    await page.goto('/en/admin/listings/1');
    await page.getByRole('tab', { name: /Plugins/i }).click();

    await expect(page.getByText(/Listing Plugins/i)).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /booking/i })).toBeVisible({ timeout: 8000 });
  });
});
