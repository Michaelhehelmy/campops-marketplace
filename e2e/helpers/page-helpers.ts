/**
 * Page helper functions for common actions
 * These encapsulate repetitive test actions using resilient locators
 */

export class HomePage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/en');
  }

  async searchFor(destination: string) {
    await this.page.getByPlaceholder('Where to?').fill(destination);
    await this.page.getByRole('button', { name: /search/i }).click();
  }

  async selectDates(checkIn: string, checkOut: string) {
    await this.page.getByPlaceholder(/check.?in/i).fill(checkIn);
    await this.page.getByPlaceholder(/check.?out/i).fill(checkOut);
  }

  async selectGuests(count: string) {
    await this.page.getByRole('combobox').selectOption(count);
  }
}

export class SearchPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/en/search');
  }

  async expectResultsCount(count: number) {
    await expect(this.page.getByText(new RegExp(`${count} propert`, 'i'))).toBeVisible();
  }

  async expectNoResults() {
    await expect(this.page.getByText(/no properties/i)).toBeVisible();
  }
}

export class ListingPage {
  constructor(private page: any) {}

  async goto(slug: string) {
    await this.page.goto(`/en/stay/${slug}`);
  }

  async expectBookingCTA() {
    await expect(this.page.getByRole('button', { name: /book/i })).toBeVisible();
  }

  async expectPrice(price: string) {
    await expect(this.page.getByText(new RegExp(price, 'i'))).toBeVisible();
  }
}

export class AuthPage {
  constructor(private page: any) {}

  async gotoLogin() {
    await this.page.goto('/en/login');
  }

  async fillCredentials(email: string, password: string) {
    await this.page.getByPlaceholder(/email/i).fill(email);
    await this.page.getByPlaceholder(/password/i).fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }
}
