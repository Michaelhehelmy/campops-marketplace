# Testing Guide

## Overview

SinaiCamps uses Vitest for unit/integration tests and Playwright for E2E tests.

## Running Tests

```bash
# Run all unit tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npx vitest run src/lib/__tests__/cache.test.ts

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests (headed, visible browser)
npm run test:e2e:headed

# Run E2E with UI mode
npm run test:e2e:ui
```

## Test Structure

```
src/lib/__tests__/          — Core library unit tests (50 files)
plugins/*/__tests__/        — Plugin unit tests (25 files)
e2e/tests/                   — Playwright E2E tests (24 files)
```

## Writing Unit Tests

### Plugin Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import init from '../src/index';

function createMockAPI() {
  return {
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    db: {
      createTable: vi.fn(async () => {}),
      execute: vi.fn(async () => {}),
      query: vi.fn(async () => []),
      transaction: vi.fn(async (fn) => fn({ execute: vi.fn() })),
    },
    registerRoute: vi.fn(),
    registerHook: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'test-user', role: 'master', email: 'test@test.com' },
      }),
    },
    ui: { addSlotComponent: vi.fn() },
  };
}

describe('Plugin: my-plugin', () => {
  it('initializes without error', async () => {
    const api = createMockAPI();
    await expect(init(api)).resolves.not.toThrow();
    expect(api.db.createTable).toHaveBeenCalled();
    expect(api.registerRoute).toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    const api = createMockAPI();
    api.auth.getSession = vi.fn().mockResolvedValue(null);
    await init(api);
    // Test route handler with mock request
  });
});
```

### Mock Store

Some tests use `resetMockStore()` which recreates tables with a fixed schema. When writing tests that interact with the mock store, ensure column names match exactly.

## Writing E2E Tests

### File Structure

```typescript
// e2e/tests/my-test.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsMaster } from '../fixtures/auth';

test.describe('Feature', () => {
  test('works correctly', async ({ page }) => {
    await loginAsMaster(page);
    await page.goto('/en/admin');
    await expect(page.locator('h1')).toHaveText('Admin Dashboard');
  });
});
```

### Auth Fixtures

```typescript
// e2e/fixtures/auth.ts
import { Page } from '@playwright/test';

export async function loginAsMaster(page: Page) {
  await page.goto('/en/login');
  await page.fill('input[name="email"]', 'master@sinaicamps.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**');
}
```

Available test users:
- `master@sinaicamps.com` — marketplace_master role
- `owner@test.com` — manager-tenant role
- `staff@test.com` — staff role

## Test Coverage

Current coverage targets:
- Unit tests: 1158+ passing
- E2E tests: 206+ passing
- Plugins with tests: 20/24 covered
- No `.skip` tests permitted

## Pre-existing Issues

- `plugin-ecosystem.test.ts`: expects event type `'install'` but system emits `'enable'` (test assertion mismatch)
- LSP errors in `plugins/booking/src/api/routes.ts` (`@/lib/metrics` not found) and `plugins/booking/src/services/RoomService.ts` (import extension) are pre-existing and do not affect test execution
