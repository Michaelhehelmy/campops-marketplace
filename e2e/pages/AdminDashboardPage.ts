import { Page, Locator, expect } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/en/admin');
  }

  async gotoPlugins() {
    await this.page.goto('/en/admin/plugins');
  }

  async setPluginGlobalStatus(pluginName: string, status: 'enable' | 'disable') {
    const getLocators = () => {
      const pluginRow = this.page
        .getByRole('region', { name: new RegExp(pluginName, 'i') })
        .first();
      return {
        pluginRow,
        enableButton: pluginRow.getByRole('button', { name: /Enable Globally/i }),
        disableButton: pluginRow.getByRole('button', { name: /Disable Globally/i }),
      };
    };

    if (status === 'enable') {
      await expect(async () => {
        const { pluginRow, enableButton, disableButton } = getLocators();
        await expect(pluginRow).toBeVisible();
        if (await enableButton.isVisible()) {
          await enableButton.click();
        }
        await expect(disableButton).toBeVisible();
      }).toPass({ timeout: 20000 });
    } else {
      await expect(async () => {
        const { pluginRow, enableButton, disableButton } = getLocators();
        await expect(pluginRow).toBeVisible();
        if (await disableButton.isVisible()) {
          await disableButton.click();
        }
        await expect(enableButton).toBeVisible();
      }).toPass({ timeout: 20000 });
    }
  }

  async expectPluginStatus(pluginName: string, status: 'enabled' | 'disabled') {
    const pluginRow = this.page.getByRole('region', { name: new RegExp(pluginName, 'i') }).first();
    const expectedButtonText = status === 'enabled' ? /Disable/i : /Enable/i;
    await expect(pluginRow.getByRole('button', { name: expectedButtonText }).first()).toBeVisible({
      timeout: 15000,
    });
  }
}
