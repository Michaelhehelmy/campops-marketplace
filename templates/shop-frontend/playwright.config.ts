import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test", override: true });

/**
 * CampOps E2E Test Configuration
 * Tests the new React frontend at localhost:5173 against backend at localhost:5000
 */
export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: "line",
  timeout: 60000,
  globalTimeout: 30 * 60 * 1000, // 30 min hard cap
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: "http://localhost:5173",
    actionTimeout: 20000,
    navigationTimeout: 30000,
    waitUntil: "domcontentloaded",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    // Auth tests run without stored state
    {
      name: "auth",
      testMatch: ["**/auth/**/*.spec.ts", "**/auth/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    // Admin tests
    {
      name: "admin",
      testMatch: ["**/admin/**/*.spec.ts", "**/admin/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Manager tests
    {
      name: "manager",
      testMatch: ["**/manager/**/*.spec.ts", "**/manager/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/manager.json",
      },
    },
    // Guest tests
    {
      name: "guest",
      testMatch: ["**/guest/**/*.spec.ts", "**/guest/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/guest.json",
      },
    },
    // Common tests run as admin
    {
      name: "common",
      testMatch: ["**/common/**/*.spec.ts", "**/common/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Security tests run without stored state
    {
      name: "security",
      testMatch: ["**/security/**/*.spec.ts", "**/security/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    // Staff tests run as admin (covers POS, orders, housekeeping, roster)
    {
      name: "staff",
      testMatch: ["**/staff/**/*.spec.ts", "**/staff/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Chef tests run as chef
    {
      name: "chef",
      testMatch: ["**/chef/**/*.spec.ts", "**/chef/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/chef.json",
      },
    },
    // Integration tests — cross-role journeys
    {
      name: "integrations",
      testMatch: ["**/integrations/**/*.spec.ts", "**/integrations/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/guest.json",
      },
    },
    // Public tests — unauthenticated, no storageState
    {
      name: "public",
      testMatch: ["**/public/**/*.spec.ts", "**/public/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    // Mobile tests — iPhone 12 viewport via Chromium (webkit needs Ubuntu 24+ libs)
    {
      name: "mobile-iphone",
      testMatch: ["**/mobile/**/*.spec.ts", "**/mobile/**/*.test.ts"],
      use: {
        ...devices["iPhone 12"],
        browserName: "chromium",
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Mobile tests — iPad Mini viewport via Chromium
    {
      name: "mobile-ipad",
      testMatch: ["**/mobile/**/*.spec.ts", "**/mobile/**/*.test.ts"],
      use: {
        ...devices["iPad Mini"],
        browserName: "chromium",
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Accessibility tests — run as admin (covers all routes)
    {
      name: "a11y",
      testMatch: ["**/a11y/**/*.spec.ts", "**/a11y/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // PWA tests — offline, install prompt, background sync
    {
      name: "pwa",
      testMatch: ["**/pwa/**/*.spec.ts", "**/pwa/**/*.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    // Visual regression — run as admin
    {
      name: "visual",
      testMatch: "**/tests/e2e/visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
  ],

  webServer: [
    {
      command: "npx tsx server/index.ts",
      url: "http://localhost:5000/api/health",
      reuseExistingServer: true,
      env: {
        NODE_ENV: "test",
        DATABASE_URL: process.env.DATABASE_URL || "",
        JWT_SECRET: process.env.JWT_SECRET || "e2e-test-secret-key",
      },
      timeout: 60 * 1000,
    },
    {
      command: "cd frontend && npm run dev -- --mode test",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30 * 1000,
    },
  ],
});
