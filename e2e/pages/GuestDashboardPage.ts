import { Page, Locator, expect } from '@playwright/test';

export class GuestDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/en/guest');
  }

  async expectTripsVisible() {
    await expect(this.page.getByTestId('guest-reservations-list')).toBeVisible();
  }

  async gotoReservations() {
    await this.page.goto('/en/guest/reservations');
  }
}
