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
    await expect(page.getByText(/Guest Dashboard/i)).toBeVisible();

    // 2. Reservations
    await page.goto('/en/guest/reservations');
    await expect(page.getByText(/Your Stays/i)).toBeVisible();

    // 3. Following
    await page.goto('/en/guest/following');
    await expect(page.getByRole('heading', { name: /Following/i })).toBeVisible();

    // 4. Settings
    await page.goto('/en/guest/settings');
    await expect(page.getByText(/Profile Settings/i)).toBeVisible();
  });
});
