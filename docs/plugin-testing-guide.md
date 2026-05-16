# Plugin Testing Guide

This guide defines the testing strategy for the SinaiCamps Marketplace plugin ecosystem. Every plugin must be verified at three levels to ensure stability and compatibility with the core platform and other plugins.

## 1. Testing Pyramid Overview

| Layer           | Scope                    | Tool             | Rationale                                                                    |
| --------------- | ------------------------ | ---------------- | ---------------------------------------------------------------------------- |
| **Unit**        | Isolated Plugin Logic    | Vitest           | Fastest; verifies initialization, table definitions, and hook registrations. |
| **Integration** | Multi-plugin Interaction | Vitest + DB Mock | Verifies inter-plugin communication (hooks) and data persistence.            |
| **E2E**         | Full User Flow           | Playwright       | Verifies the master toggle, UI slot rendering, and frontend behavior.        |

---

## 2. Unit Testing Plugin Logic

Unit tests should focus on the `init(api)` function and any service logic provided by the plugin. Use Vitest mocks to simulate the `PluginAPI`.

### Mocking the PluginAPI

For simple unit tests, create a mock object that implements the interface expected by your plugin.

```typescript
// plugins/booking/__tests__/index.test.ts
import { describe, it, expect, vi } from 'vitest';
import init from '../src/index';

describe('Booking Plugin Unit', () => {
  it('initializes and registers components', async () => {
    const mockApi = {
      logger: { info: vi.fn() },
      db: { createTable: vi.fn().mockResolvedValue(undefined) },
      ui: {
        addSlotComponent: vi.fn(),
        addSettingsPage: vi.fn(),
      },
      registerRoute: vi.fn(),
    };

    await init(mockApi as any);

    expect(mockApi.db.createTable).toHaveBeenCalledWith(
      'records',
      expect.stringContaining('guest_name')
    );
    expect(mockApi.ui.addSlotComponent).toHaveBeenCalledWith(
      'listing.sidebar',
      'booking:BookingWidget'
    );
  });
});
```

### Testing Hook Execution

If your plugin fires hooks, verify that `api.executeHook` is called with the correct payload.

```typescript
it('fires BOOKING_CREATED hook when booking is saved', async () => {
  const mockExecuteHook = vi.fn().mockResolvedValue({});
  const mockApi = {
    // ... other mocks
    executeHook: mockExecuteHook,
  };

  const service = await init(mockApi as any);
  await (service as any).createBooking({ guestName: 'John Doe' });

  expect(mockExecuteHook).toHaveBeenCalledWith(
    'BOOKING_CREATED',
    expect.objectContaining({
      guestName: 'John Doe',
    })
  );
});
```

---

## 3. Integration Testing

Integration tests use the real `PluginAPI` factory and the in-memory database mock. This is essential for verifying that your plugin correctly stores data and interacts with other plugins via the real `hookManager`.

### Verifying Table Persistence

Use `api.db.tableExists` to confirm that your `init` function correctly provisioned the database.

```typescript
// plugins/pwa/__tests__/pwa-plugin.test.ts
import { makePluginAPI } from '../../../src/lib/PluginAPI';

it('should initialize and create settings table', async () => {
  const api = makePluginAPI('pwa');
  await init(api);

  const exists = await api.db.tableExists('settings');
  expect(exists).toBe(true);
});
```

### Inter-Plugin Communication

Verify that one plugin's actions trigger logic in another plugin.

```typescript
// src/lib/__tests__/plugin-integration.test.ts
import bookingInit from '../../../plugins/booking/src/index';
import crmInit from '../../../plugins/crm/src/index';

it('triggers CRM activity logging when a booking is created', async () => {
  const propertyId = 'prop-123';

  // Initialize both plugins with the same property context
  const bookingService = await bookingInit(makePluginAPI('booking', propertyId));
  const crmService = await crmInit(makePluginAPI('crm', propertyId));

  // Perform action in Plugin A
  await (bookingService as any).createBooking({ guestName: 'Samantha Reed' });

  // Verify side effect in Plugin B
  const activities = await (crmService as any).getActivities('Samantha Reed');
  expect(activities).toHaveLength(1);
  expect(activities[0].activity_type).toBe('BOOKING_CREATED');
});
```

---

## 4. E2E Testing (Playwright)

End-to-End tests verify the "Master Toggle" flow and the guest-facing UI.

### Test Patterns

1. **Master Enable**: Login as Master -> Admin -> Enable Plugin -> Verify in Public UI.
2. **Component Interaction**: Interact with a plugin widget (e.g., Booking form) -> Verify backend update or cross-plugin notification.

```typescript
// e2e/tests/plugin-lifecycle.spec.ts
test('master can enable booking plugin and it appears in sidebar', async ({ page, adminPage }) => {
  // 1. Master enables plugin
  await adminPage.goto('/admin/plugins');
  await adminPage.click('[data-testid="toggle-booking"]');

  // 2. Guest sees widget
  await page.goto('/listing/safari-camp');
  await expect(page.locator('[data-testid="booking-widget"]')).toBeVisible();
});
```

---

## 5. Best Practices

1. **Isolation**: Always use `hookManager.clear()` and `db.resetMockStore()` in `beforeEach` for integration tests to prevent state leakage.
2. **Defensive Hooking**: Test that your plugin works even if no one is listening to your hooks (Standalone mode).
3. **No Placeholders**: Use real data and realistic SQL queries. The in-memory mock supports `JOIN`, `LIKE`, and `IN` operators.
4. **Permissions**: If your plugin uses permissions, verify that they are correctly listed in the `manifest` within `init`.
