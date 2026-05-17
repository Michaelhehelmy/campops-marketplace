import { test, expect } from '@playwright/test';
import { PublicListingPage } from '../pages/PublicListingPage';

test.describe('Marketplace Public Full Journey', () => {
  test('Public user can browse, search, and view a camp listing', async ({ page }) => {
    // 1. Homepage loads
    await page.goto('/en');
    await expect(page.getByText(/Adventure Awaits/i)).toBeVisible();

    // 2. View Detail Page
    const listingPage = new PublicListingPage(page);
    await listingPage.goto('safari-camp');

    // 3. Listing detail renders with room types
    await expect(page.getByText(/Room types/i)).toBeVisible();

    // 4. Rooms from seed data are shown
    await listingPage.expectRoomAvailable('room-1');
    await listingPage.expectRoomAvailable('room-2');

    // 5. Search availability inputs are present (booking fallback or plugin)
    await expect(page.getByTestId('check-in-input')).toBeVisible();
    await expect(page.getByTestId('search-button')).toBeVisible();
  });
});
