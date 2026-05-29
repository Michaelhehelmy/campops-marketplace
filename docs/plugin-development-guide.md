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
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

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

Defines the plugin's identity, capabilities, and UI integration points.

```json
{
  "id": "my-plugin",
  "name": "My Great Plugin",
  "version": "1.0.0",
  "campopsVersion": ">=1.0.0",
  "entry": "src/index.ts",
  "uiEntry": "src/ui.tsx",
  "capabilities": ["database", "hooks", "ui", "routes"],
  "hooks": [],
  "reviewStatus": "draft",
  "slots": {
    "dashboard.top": ["my-plugin:MyWidget"]
  }
}
```

Required fields: `id`, `name`, `version`, `campopsVersion`, `capabilities`, `entry`, `reviewStatus`. See `plugins/booking/plugin.json` for a complete example.

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

Use string constants from the SDK whenever possible:

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.PAYMENT_ON_SUCCESS, async (data) => {
  api.logger.info(`Payment of ${data.amount} received!`);
  return data;
});
```

See the full [hook catalog](docs/plugins/hook-catalog.md) for all available hook names and payloads.

### Using Core Services

```typescript
await api.services.notification.send({
  to: 'guest@example.com',
  channel: 'email',
  body: 'Welcome to our camp!',
});
```

## 6. Authentication in Plugin Routes

Protect plugin API routes using `api.auth.getSession()`:

```typescript
import { Hono } from 'hono';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function registerRoutes(api: PluginAPI) {
  const app = new Hono();

  app.get('/my-plugin/settings', async (c) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    // Access session.user.role, session.user.id, etc.
    return c.json({ settings: {} });
  });

  api.registerRoute('/api/plugins/my-plugin/*', app.fetch);
}
```

Use inline role checks — do NOT import `requireRole` from the core:

```typescript
const session = await api.auth.getSession(c.req.raw);
if (!session || session.user.role !== 'master') {
  return c.json({ error: 'Forbidden' }, 403);
}
```

## 7. Database Transaction Safety

> **SQLite transaction safety**: The platform serializes all SQLite transactions via a
> promise-chain queue in `DrizzleDatabaseWrapper`. Never call `db.transaction()` concurrently
> from a plugin — it is safe to call it sequentially. This prevents `SQLITE_BUSY` race conditions
> in Next.js concurrent request handling. Always use `api.db.transaction()` (the wrapper), not
> a raw `better-sqlite3` transaction.

```typescript
// ✅ Correct: use the API wrapper
await api.db.transaction(async (tx) => {
  await tx.insert(schema).values({ ... });
});

// ❌ Wrong: bypassing the wrapper risks SQLITE_BUSY
```

## 8. Common Gotchas

### Node16 moduleResolution — `.js` extensions

The plugin SDK uses `moduleResolution: node16`. All relative imports must include `.js` extensions:

```typescript
// ❌ Wrong — will fail:
import { MyService } from '../services/MyService';

// ✅ Correct:
import { MyService } from '../services/MyService.js';
```

### Logger usage

Always use `api.logger.info()` / `api.logger.error()` — not `console.log()`:

```typescript
api.logger.info('Plugin initialized successfully');
api.logger.error('Failed to sync calendar', { error: err.message });
```

The logger prefixes messages with the plugin ID and timestamps automatically. Do NOT import the server-side `logger` from `src/lib/logger`.

### Plugin manifest

Every plugin must have a `plugin.json` file in its root directory. The `reviewStatus` field can be `"draft"`, `"submitted"`, `"approved"`, or `"rejected"`. Plugins with `reviewStatus: "draft"` are only visible in development mode.

## 9. Testing

Testing is critical for marketplace stability. For detailed instructions, see the [Plugin Testing Guide](./development/testing.md).

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

The PWA plugin (`plugins/pwa/`) is the official reference implementation. It demonstrates:

- Persistent storage for push subscriptions.
- Mobile install banner injection.
- Admin settings configuration.
- Service worker integration.

---

_For more details, see the [Plugin SDK types](../packages/plugin-sdk/src/types.ts)._
