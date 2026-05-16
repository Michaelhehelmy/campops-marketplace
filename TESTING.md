# Testing Guidelines

This document describes how the CampOps Marketplace core framework is tested and how to add tests for new plugins.

---

## Test Architecture

```
campops-marketplace/
├── src/
│   ├── lib/__tests__/           Core framework unit tests (Vitest)
│   ├── db/__tests__/            Schema / DB layer tests (Vitest)
│   ├── app/api/**/__tests__/    Core API route tests (Vitest)
│   └── components/**/__tests__/ Core UI component tests (Vitest + jsdom)
├── packages/
│   └── plugin-sdk/__tests__/   Plugin SDK contract tests (Vitest)
├── plugins/
│   ├── test-dock/               Reference plugin + unit tests
│   ├── test-probe/              Minimal probe plugin for core E2E tests
│   │   └── src/__tests__/       test-probe unit tests (run from root suite)
│   └── <plugin-name>/
│       └── __tests__/           Plugin-specific tests (NOT run from root)
└── e2e/
    ├── pages/                   Page Object Models
    ├── tests/core/              Core framework E2E tests (Playwright)
    └── tests/                   Domain/plugin E2E tests
```

---

## Running Tests

### Unified Quality Checks (Recommended)

To ensure code formatting, linting, and tests pass before committing or deploying, use the unified check commands:

```bash
# Run formatting check, linting, and unit/integration tests with coverage
npm run check

# Run the above PLUS the full E2E test suite (slower)
npm run check:full

# Auto-format all code
npm run format
```

### Unit / Integration (Vitest)

```bash
# All core tests (100% must pass)
npm run test

# Run with coverage report
npm run test:coverage

# Watch mode
npx vitest
```

### E2E (Playwright) — requires server running

```bash
# Start the server first
npm run dev   # or npm run build && npm start

# All E2E tests
npx playwright test

# Core E2E only (no domain dependencies)
npx playwright test e2e/tests/core/

# With UI
npx playwright test --ui
```

---

## Core vs Plugin Tests

### What is a core test?

A core test verifies the **framework infrastructure** — things every plugin relies on:

| Area                                   | Files                                        |
| -------------------------------------- | -------------------------------------------- |
| Plugin lifecycle (init, route reg.)    | `src/lib/__tests__/plugin-ecosystem.test.ts` |
| Hook system                            | `src/lib/__tests__/hooks.test.ts`            |
| PluginAPI surface                      | `src/lib/__tests__/PluginAPI.test.ts`        |
| Database wrapper                       | `src/lib/__tests__/db.test.ts`               |
| Plugin SDK contracts                   | `packages/plugin-sdk/__tests__/`             |
| UI registry route                      | `src/app/api/plugins/ui-registry/__tests__/` |
| Master APIs (listings, plugins, stats) | `src/app/api/master/*/__tests__/`            |
| UI components (shell)                  | `src/components/homepage/__tests__/`         |

Core tests **must not** depend on domain concepts (bookings, rooms, guests, etc.).

### What is a plugin test?

A plugin test verifies **domain logic inside a plugin**:

- Booking plugin table creation
- CRM activity logging
- Plugin-to-plugin hook communication

Plugin tests live in `plugins/<name>/__tests__/` and are **excluded from the root Vitest run** (see `vitest.config.ts` excludes).

---

## Adding Tests for a New Plugin

### 1. Create plugin unit tests

```
plugins/my-plugin/
└── __tests__/
    └── index.test.ts   ← tests for init(), routes, hooks, DB
```

Use the `buildMockApi()` helper pattern (see `plugins/test-probe/src/__tests__/index.test.ts`):

```ts
import { describe, it, expect, vi } from 'vitest';
import { init } from '../src/index.js';

function buildMockApi() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      getTable: vi.fn().mockReturnValue({ findMany: vi.fn(), create: vi.fn() }),
    },
    ui: { addSlotComponent: vi.fn(), registerMenuItem: vi.fn() },
    registerRoute: vi.fn(),
    registerHook: vi.fn().mockReturnValue(() => {}),
    hooks: { registerHook: vi.fn(), executeHook: vi.fn() },
    config: {},
  };
}

it('creates the my-plugin table', async () => {
  const api = buildMockApi();
  await init(api as any);
  const tableNames = api.db.createTable.mock.calls.map((c) => c[0]);
  expect(tableNames).toContain('my-table');
});
```

**Plugin unit tests run with a separate vitest config** inside the plugin directory or are excluded from root to avoid path resolution issues.

### 2. Add plugin E2E tests

```
plugins/my-plugin/
└── e2e/
    └── my-plugin.spec.ts
```

Reference existing plugin via the test-probe pattern — use `CoreProbeApiPage` to reset state before each test, then hit your plugin's routes:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/test/reset');
});

test('my-plugin responds to ping', async ({ request }) => {
  const res = await request.get('/api/my-plugin/ping');
  expect(res.status()).toBe(200);
});
```

### 3. Use data-testid selectors

All new UI components should use `data-testid` attributes for E2E selectors:

```tsx
<button data-testid="my-plugin-submit">Submit</button>
```

Then reference with `page.getByTestId('my-plugin-submit')`.

---

## Test-Probe Plugin

`plugins/test-probe/` is a **minimal probe plugin** that exercises all core framework integration points:

| Feature             | How tested                                              |
| ------------------- | ------------------------------------------------------- |
| DB table creation   | `api.db.createTable('probes', ...)`                     |
| API route           | `GET /api/test-probe/ping`, `POST /api/test-probe/echo` |
| Hook                | `test-probe.echo` hook fires on POST /echo              |
| UI slot             | `DASHBOARD_WIDGETS` + `listing.sidebar`                 |
| Menu item           | `/admin/test-probe`                                     |
| Multi-tenant writes | `POST /api/test-probe/echo?slug=<tenant>`               |

Use it from core E2E tests to verify framework behavior without domain coupling.

---

## Vitest Configuration

Key settings in `vitest.config.ts`:

- **`globals: true`** — `describe`, `it`, `expect`, `vi` are available without imports
- **`environment: node`** — default; use `// @vitest-environment jsdom` per file for React components
- **`setupFiles: ['./src/test/setup.ts']`** — runs DB init before all tests
- **`exclude`** — `e2e/**`, `templates/**`, `plugins/booking/__tests__/routes/**`

---

## Core E2E Test Files

Located in `e2e/tests/core/`:

| File                             | What it covers                                 |
| -------------------------------- | ---------------------------------------------- |
| `plugin-lifecycle.spec.ts`       | Plugin init, route dispatch, unknown route 404 |
| `multi-tenant-isolation.spec.ts` | Tenant-scoped writes, UI registry context      |
| `core-apis.spec.ts`              | Master listings/plugins/stats APIs             |
| `auth.spec.ts`                   | Login page, protected routes, session endpoint |
| `ui-shell.spec.ts`               | Homepage, hero section, nav, locale routing    |

Run them independently of domain tests: `npx playwright test e2e/tests/core/`
