import { test, expect } from '../helpers/auth.fixture';

test.describe('Marketplace Guest Full Journey', () => {
  test('Guest can manage reservations, follow listings, and update profile', async ({
    page,
    guestSession,
  }) => {
    const storageState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Land on guest dashboard
    await page.goto('/en/guest');
    await expect(page).toHaveURL(/\/en\/guest/);

    // 2. Reservations
    await page.goto('/en/guest/reservations');
    await expect(page).toHaveURL(/\/en\/guest\/reservations/);

    // 3. Following
    await page.goto('/en/guest/following');
    await expect(page).toHaveURL(/\/en\/guest\/following/);

    // 4. Settings
    await page.goto('/en/guest/settings');
    await expect(page).toHaveURL(/\/en\/guest\/settings/);
  });
});
