import { chromium } from '@playwright/test';

/**
 * Global Setup for E2E Tests
 *
 * Resets the database to a known state before the test suite runs.
 * This ensures all plugin-lifecycle and other stateful tests start with clean data.
 */
async function globalSetup() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const response = await page.request.post('http://localhost:3000/api/test/reset');
    const status = response.status();
    if (status === 200) {
      console.log('[Global Setup] Database reset successfully');
    } else {
      const text = await response.text();
      console.warn(`[Global Setup] Database reset returned status ${status}: ${text}`);
    }
  } catch (err) {
    console.warn('[Global Setup] Could not reset database:', err);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
