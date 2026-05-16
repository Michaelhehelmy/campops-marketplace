import { Page, Locator, expect } from '@playwright/test';

export class PublicListingPage {
  readonly page: Page;
  readonly bookingWidget: Locator;
  readonly checkInInput: Locator;
  readonly checkOutInput: Locator;
  readonly guestsInput: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookingWidget = page.getByTestId('booking-real');
    this.checkInInput = page.getByTestId('check-in-input');
    this.checkOutInput = page.getByTestId('check-out-input');
    this.guestsInput = page.getByTestId('guests-input');
    this.searchButton = page.getByTestId('search-button');
  }

  async goto(slug: string) {
    await this.page.goto(`/en/stay/${slug}`);
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    // Wait for the real plugin to load instead of the fallback
    await this.bookingWidget.waitFor({ state: 'visible', timeout: 30000 });
  }

  async searchAvailability(checkIn: string, checkOut: string, guests: number = 2) {
    await this.checkInInput.fill(checkIn);
    await this.checkOutInput.fill(checkOut);
    await this.guestsInput.fill(guests.toString());
    await this.page.waitForTimeout(500); // Wait for potential state updates
    await this.searchButton.click();
  }

  async bookRoom(roomId: string) {
    const bookButton = this.bookingWidget.getByTestId(`book-button-${roomId}`);
    await bookButton.click();
  }

  async expectRoomAvailable(roomId: string) {
    const roomItem = this.bookingWidget.getByTestId(`room-item-${roomId}`);
    await expect(roomItem).toBeVisible();
  }
}
