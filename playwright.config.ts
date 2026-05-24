import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SinaiCamps Marketplace
 *
 * Base URL: http://localhost:3001 (dev server)
 * Tests are organized by user role in e2e/tests/
 *
 * Note: Dev server should already be running. If not, start it with `npm run dev`
 */
export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['html'], ['list']],
  timeout: 90000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
  },
  expect: {
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome',
        },
      },
    },
  ],
  webServer: {
    command:
      'SKIP_RATE_LIMIT=true FORCE_LOCAL_REDIRECT=true API_URL=http://localhost:3000 NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120000,
  },
});
