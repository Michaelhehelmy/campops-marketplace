import type { Page } from '@playwright/test';

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

/**
 * Sign in via Better Auth API and set cookies in the page context.
 * Returns the CSRF token for authenticated API calls.
 */
export async function loginAs(page: Page, email: string, password = 'password123') {
  let res: import('@playwright/test').APIResponse | undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await page.request.post('http://localhost:3000/api/auth/sign-in/email', {
        headers: { Origin: 'http://localhost:3000' },
        data: { email, password },
        timeout: 30000,
      });
      if (res.ok()) break;
      lastError = new Error(`HTTP ${res.status()}`);
    } catch (e) {
      lastError = e;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  if (!res || !res.ok()) {
    throw new Error(`loginAs(${email}) failed: ${res ? res.status() : (lastError as Error)?.message}`);
  }
  const raw = res.headers()['set-cookie'] || '';
  const match = raw.match(/x-csrf-token=([^;]+)/);
  const csrfToken = match ? match[1] : '';
  return csrfToken;
}

/**
 * Sign in via API and return CSRF + session cookies for use with APIRequestContext.
 */
export async function signInForRequest(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password = 'password123'
): Promise<{ csrfToken: string }> {
  const res = await request.post('http://localhost:3000/api/auth/sign-in/email', {
    headers: { Origin: 'http://localhost:3000' },
    data: { email, password },
  });
  const raw = res.headers()['set-cookie'] || '';
  const match = raw.match(/x-csrf-token=([^;]+)/);
  const csrfToken = match ? match[1] : '';
  return { csrfToken };
}

export function extractCsrf(response: import('@playwright/test').APIResponse): string {
  const raw = response.headers()['set-cookie'] || '';
  const match = raw.match(/x-csrf-token=([^;]+)/);
  return match ? match[1] : '';
}

export function futureDates(daysFromNow: number, nights: number) {
  const checkIn = new Date(Date.now() + daysFromNow * 86400000);
  const checkOut = new Date(checkIn.getTime() + nights * 86400000);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}
