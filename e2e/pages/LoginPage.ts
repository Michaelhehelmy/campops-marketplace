import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-button');
  }

  async goto() {
    await this.page.goto('/en/login');
  }

  async login(email: string, password: string) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
      try {
        await this.page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
        return;
      } catch {
        if (attempt === 1) {
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await this.page.goto('/en/login', { waitUntil: 'networkidle' });
        }
      }
    }
    throw new Error(`login(${email}) failed after 2 attempts`);
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
