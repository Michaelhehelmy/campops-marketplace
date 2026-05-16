import { test, expect } from '@playwright/test';
import { PublicListingPage } from '../pages/PublicListingPage';

test.describe('Marketplace Public Full Journey', () => {
  test('Public user can browse, search, and book a camp', async ({ page }) => {
    // 1. Homepage loads
    await page.goto('/en');
    await expect(page.getByText(/Adventure Awaits/i)).toBeVisible();

    // 2. View Detail Page
    const listingPage = new PublicListingPage(page);
    await listingPage.goto('safari-camp');

    // 3. Search Availability
    await listingPage.searchAvailability('2026-06-15', '2026-06-20', 2);
    // Wait for results
    await expect(page.getByText(/Available Rooms/i)).toBeVisible();

    // 4. Book a room
    await listingPage.expectRoomAvailable('room-1');
    await listingPage.bookRoom('room-1');

    // 5. Fill guest details
    await expect(page.getByRole('heading', { name: /Guest details/i })).toBeVisible();
    await page.getByLabel(/Full name/i).fill('Public Traveler');
    await page.getByLabel(/Email address/i).fill('public@traveler.com');
    await page.waitForTimeout(1000);
    await page.getByTestId('continue-to-payment').click();

    // 6. Select Pay at Property
    await expect(page.getByTestId('payment-method-heading')).toBeVisible({ timeout: 15000 });
    await page.getByLabel(/Pay at property/i).check();
    await page.getByRole('button', { name: /Confirm Booking/i }).click();

    // 7. Success Page
    await expect(page.getByText(/Booking Confirmed/i)).toBeVisible();
  });
});
