import { test, expect } from '@playwright/test';
import { PublicListingPage } from '../pages/PublicListingPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Marketplace Public (unauthenticated)', () => {
  test('Browse homepage and view search results', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CampOps/i);

    // Browse to search
    await page.getByRole('link', { name: /Search/i }).click();
    await expect(page).toHaveURL(/\/en\/search/);

    // See listings
    await expect(page.getByRole('heading', { name: /Available Camps/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Safari Camp/i }).first()).toBeVisible();
  });

  test('Search and filter listings', async ({ page }) => {
    await page.goto('/en/search');

    const searchInput = page.getByPlaceholder(/Search for camps/i);
    await searchInput.fill('Safari');
    await searchInput.press('Enter');

    await expect(page.getByRole('link', { name: /Safari Camp/i }).first()).toBeVisible();
    // Note: Search uses LIKE matching, so results may include partial matches
    // This test verifies Safari Camp appears in results
  });

  test('Full booking flow: Browse -> Select -> Book -> Confirm', async ({ page }) => {
    const listingPage = new PublicListingPage(page);
    await page.goto('/en/search');

    // Select listing
    await page
      .getByRole('link', { name: /Safari Camp/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/stay\/safari-camp/);
    await listingPage.waitForLoaded();

    // Use POM to search and book
    await listingPage.searchAvailability('2026-05-15', '2026-05-20', 2);
    // Wait for loading to finish and rooms to appear
    await expect(page.getByText(/Available Rooms/i)).toBeVisible();

    // The plugin should show available rooms now
    // In our seed, Safari Camp has room 'room-1'
    await listingPage.expectRoomAvailable('room-1');
    await listingPage.bookRoom('room-1');

    // Verify summary page
    await expect(page).toHaveURL(/\/en\/book\/summary/);

    // Fill guest details
    await page.getByLabel(/Full name/i).fill('John Doe');
    await page.getByLabel(/Email address/i).fill('john@example.com');
    await page.getByLabel(/Phone/i).fill('+1234567890');

    // Proceed
    await page.waitForTimeout(1000);
    await page.getByTestId('continue-to-payment').click();

    // Wait for step transition
    await expect(page.getByTestId('payment-method-heading')).toBeVisible({ timeout: 15000 });

    // Select Pay at Property
    await page.getByLabel(/Pay at property/i).check();
    await page.getByRole('button', { name: /Confirm Booking/i }).click();

    // Confirmation
    await expect(page.getByRole('heading', { name: /Booking Confirmed!/i })).toBeVisible();
  });

  test('Navigate to login and signup', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page).toHaveURL(/\/en\/login/);

    await page.getByRole('link', { name: /Register your property/i }).click();
    await expect(page).toHaveURL(/\/en\/list-your-camp/);
  });
});
