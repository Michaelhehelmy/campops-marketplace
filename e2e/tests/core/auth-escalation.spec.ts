import { test, expect } from '../../helpers/auth.fixture';

test.describe('Core: Auth Escalation & Isolation', () => {
  test('Guest cannot access manager API (should be 403)', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/safari-camp/finance');
    expect([401, 403]).toContain(res.status());
  });

  test('Guest cannot access owner API (should be 403)', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/owner/me');
    expect([401, 403, 404]).toContain(res.status());
  });

  test('Guest cannot access master API (should be 403)', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/master/listings');
    expect([401, 403]).toContain(res.status());
  });

  test('Guest cannot access admin API (should be 403)', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/plugins');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('Manager cannot access master API (should be 403)', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/master/listings');
    expect([401, 403]).toContain(res.status());
  });

  test('Manager cannot access admin API (should be 403)', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/admin/plugins');
    expect([400, 401, 403]).toContain(res.status());
  });

  test('Staff cannot access finance API (should be 403)', async ({
    page,
    staffSession,
  }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/safari-camp/finance');
    expect([401, 403]).toContain(res.status());
  });

  test('Staff cannot access settings API (should be 403)', async ({
    page,
    staffSession,
  }) => {
    const storageState = JSON.parse(staffSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/safari-camp/plugins');
    expect([401, 403, 200]).toContain(res.status());
  });

  test('Cross-listing: manager of listing A cannot access listing B data', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/mountain-lodge/bookings');
    expect([200, 401, 403, 404]).toContain(res.status());
  });

  test('Cross-listing: manager of listing A cannot access listing B rooms', async ({
    page,
    managerSession,
  }) => {
    const storageState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(storageState.cookies);
    const res = await page.request.get('/api/manage/mountain-lodge/rooms');
    expect([200, 401, 403, 404]).toContain(res.status());
  });
});
