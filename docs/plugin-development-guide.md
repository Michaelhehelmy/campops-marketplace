# SinaiCamps Marketplace Plugin Development Guide

This guide provides everything you need to know to build, test, and deploy a plugin for the SinaiCamps Marketplace.

## 1. Overview

A SinaiCamps plugin is a self-contained module that extends the core marketplace functionality. Plugins can:

- Define their own database schema.
- Inject UI components into specific slots.
- Register custom admin and settings pages.
- Hook into core system events (e.g., reservation creation, payment success).
- Access shared services (e.g., notifications, payments).

### The Plugin Lifecycle

Plugins are discovered at startup by the `PluginDiscoveryService` and initialized by the `PluginRuntimeService`. Each plugin must export a default `init` function:

```typescript
import type { PluginAPI } from 'sinaicamps-sdk';

export default async function init(api: PluginAPI) {
  api.logger.info('Plugin initializing...');
  // Registration logic here
}
```

## 2. Directory Structure

A typical plugin follows this layout:

```text
plugins/my-plugin/
├── plugin.json          # Metadata and static registration
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── src/
    ├── index.ts         # Server-side entry point
    └── ui.tsx           # Frontend UI components
```

### `plugin.json`

Defines the plugin's identity and UI integration points.

```json
{
  "id": "my-plugin",
  "name": "My Great Plugin",
  "version": "1.0.0",
  "entry": "src/index.ts",
  "uiEntry": "src/ui.tsx",
  "slots": {
    "dashboard.top": ["my-plugin:MyWidget"]
  }
}
```

## 3. Database Management

Plugins manage their own tables using the `api.db` interface. Tables are automatically namespaced to avoid collisions.

### Creating Tables

Call `createTable` in your `init` function.

```typescript
await api.db.createTable(
  'settings',
  `
  key TEXT PRIMARY KEY,
  value TEXT,
  is_enabled BOOLEAN DEFAULT true
`
);
```

_Standard columns like `id`, `property_id`, `created_at`, and `updated_at` are added automatically._

### Scoped Data Access

Plugins are automatically scoped to the current property context.

```typescript
const mySettings = await api.db.query('SELECT * FROM plugin_my_plugin_settings');
```

## 4. UI Registration

SinaiCamps uses a "Slot & Component" architecture. You register components in `ui.tsx` and map them to slots in `plugin.json` or dynamically in `index.ts`.

### Registering Components (`ui.tsx`)

```typescript
export function MyWidget() {
  return <div>Hello from my plugin!</div>;
}

export function registerPlugin(registry) {
  registry.register("my-plugin:MyWidget", MyWidget);
}
```

### Injecting into Slots (`index.ts`)

```typescript
api.ui.addSlotComponent('listing.header', 'my-plugin:MyWidget');
```

## 5. Hooks & Services

Hooks allow your plugin to react to system events or modify data during execution.

### Registering a Hook

```typescript
api.registerHook('payment.on_success', async (data) => {
  api.logger.info(`Payment of ${data.amount} received!`);
  return data;
});
```

### Using Core Services

```typescript
await api.services.notification.send({
  to: 'guest@example.com',
  channel: 'email',
  body: 'Welcome to our camp!',
});
```

## 6. Testing

Testing is critical for marketplace stability. For detailed instructions, see the [Plugin Testing Guide](file:///home/michael/Proj/sinaicamps-marketplace/docs/plugin-testing-guide.md).

### Unit Testing

Mock the `PluginAPI` to test your `init` logic.

```typescript
it("registers slots", async () => {
  const mockApi = { ui: { addSlotComponent: vi.fn() }, ... };
  await init(mockApi);
  expect(mockApi.ui.addSlotComponent).toHaveBeenCalled();
});
```

### E2E Testing

Use Playwright to verify that your UI appears in the shell when the plugin is enabled.

## 7. Full Example: PWA Plugin

The PWA plugin ([plugins/pwa](file:///home/michael/Proj/sinaicamps-marketplace/plugins/pwa)) is the official reference implementation. It demonstrates:

- Persistent storage for push subscriptions.
- Mobile install banner injection.
- Admin settings configuration.
- Service worker integration.

---

_For more details, see the [Plugin SDK types](file:///home/michael/Proj/sinaicamps-marketplace/packages/plugin-sdk/src/types.ts)._
