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
    // Accept either the full booking plugin widget or the static fallback
    this.bookingWidget = page.getByTestId('booking-real').or(page.getByTestId('booking-fallback'));
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
    // Wait for either the plugin widget or the static fallback
    await this.bookingWidget.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async searchAvailability(checkIn: string, checkOut: string, guests: number = 2) {
    await this.checkInInput.fill(checkIn);
    await this.checkOutInput.fill(checkOut);
    await this.guestsInput.fill(guests.toString());
    await this.page.waitForTimeout(500); // Wait for potential state updates
    await this.searchButton.click();
  }

  async bookRoom(roomId: string) {
    // Try plugin widget first, fall back to page-level testid
    const bookButton = this.page.getByTestId(`book-button-${roomId}`);
    await bookButton.click();
  }

  async expectRoomAvailable(roomId: string) {
    // Room items are scoped to the page — works with both plugin and fallback
    const roomItem = this.page.getByTestId(`room-item-${roomId}`);
    await expect(roomItem).toBeVisible();
  }
}
