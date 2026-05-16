import { Page, Locator, expect } from '@playwright/test';

export class ManagerBookingsPage {
  readonly page: Page;
  readonly bookingsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookingsList = page.getByTestId('manager-bookings-list');
  }

  async goto(listingId: string) {
    await this.page.goto(`/en/manage/${listingId}/bookings`);
  }

  async checkIn(bookingId: string) {
    const checkInButton = this.page.getByTestId(`check-in-button-${bookingId}`);
    await checkInButton.click();
  }

  async checkOut(bookingId: string) {
    const checkOutButton = this.page.getByTestId(`check-out-button-${bookingId}`);
    await checkOutButton.click();
  }

  async expectBookingStatus(bookingId: string, status: string) {
    const bookingItem = this.page.getByTestId(`booking-item-${bookingId}`);
    await expect(bookingItem).toContainText(status);
  }
}
