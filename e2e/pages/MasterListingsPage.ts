import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Master Listings admin page.
 * URL: /[locale]/admin/listings
 */
export class MasterListingsPage {
  readonly page: Page;
  readonly addListingBtn: Locator;
  readonly listingNameInput: Locator;
  readonly listingSlugInput: Locator;
  readonly saveListingBtn: Locator;
  readonly listingsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addListingBtn = page.getByTestId('add-listing-btn');
    this.listingNameInput = page.getByTestId('listing-name-input');
    this.listingSlugInput = page.getByTestId('listing-slug-input');
    this.saveListingBtn = page.getByTestId('save-listing-btn');
    this.listingsTable = page.locator('table');
  }

  async goto(locale = 'en') {
    await this.page.goto(`/${locale}/admin/listings`);
    await expect(this.page.getByRole('heading', { name: /Property Listings/i })).toBeVisible();
  }

  async openAddModal() {
    await this.addListingBtn.click();
    await expect(this.listingNameInput).toBeVisible();
  }

  async createListing(name: string, slug?: string) {
    await this.openAddModal();
    await this.listingNameInput.fill(name);
    if (slug) {
      await this.listingSlugInput.fill(slug);
    }
    await this.saveListingBtn.click();
    await expect(this.page.locator(`text=${name}`)).toBeVisible({ timeout: 10000 });
  }

  async getListingRow(nameOrId: string): Promise<Locator> {
    return this.page
      .getByTestId(`listing-row-${nameOrId}`)
      .or(this.page.getByRole('row').filter({ hasText: nameOrId }))
      .first();
  }

  async clickManage(listingName: string) {
    const row = this.page.getByRole('row').filter({ hasText: listingName }).first();
    await row.getByRole('link', { name: /Manage/i }).click();
  }
}
