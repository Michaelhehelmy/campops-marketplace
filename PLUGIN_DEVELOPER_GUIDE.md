# Plugin Developer Guide

## Overview

Every plugin is a self-contained Node.js module under `plugins/<plugin-id>/`.  
A plugin can register HTTP routes, database tables, UI components, and hook into
system events — all without modifying the core framework.

## Quick Start

```bash
# Copy the starter template
cp -r packages/plugin-starter plugins/my-plugin
cd plugins/my-plugin
npm install

# Create plugin.json (required for auto-discovery — see below)
cat > plugin.json <<'EOF'
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Description of what your plugin does",
  "apiVersion": "^2.0.0",
  "entry": "src/index.ts"
}
EOF

# Then edit src/index.ts and start the dev server
```

> **Important**: The starter does not include `plugin.json`. You must create it (see below) for the system to discover your plugin at startup.

## Required Files

```
plugins/<plugin-id>/
  plugin.json           # Runtime manifest — read by PluginLoader.scan()
  package.json          # NPM package identity, capabilities, dependencies
  src/
    index.ts            # Entry point — default export init(api)
    ui.tsx              # (optional) React components for UI slots
  __tests__/
    index.test.ts       # (optional) Tests
```

The system uses a **dual manifest** approach:

| File           | Discovered by                       | Purpose                                               |
| -------------- | ----------------------------------- | ----------------------------------------------------- |
| `plugin.json`  | `PluginLoader.scan()` at startup    | Registers plugin in `available_plugins` table         |
| `package.json` | `PluginRuntimeService.loadPlugin()` | Reads `sinaicamps.capabilities`, loads `src/index.ts` |

Both files are required for a plugin to work at runtime.

### `plugin.json`

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Description of what your plugin does",
  "apiVersion": "^2.0.0",
  "entry": "src/index.ts"
}
```

| Field         | Required | Description                                               |
| ------------- | -------- | --------------------------------------------------------- |
| `id`          | Yes      | Unique plugin identifier (becomes `available_plugins.id`) |
| `name`        | Yes      | Display name                                              |
| `version`     | Yes      | Semver version                                            |
| `description` | No       | Short description                                         |
| `apiVersion`  | No       | Semver range for the SDK version required                 |
| `entry`       | Yes      | Relative path to the entry point from plugin root         |
| `slots`       | No       | Map of slot names to component keys (see UI Slots)        |

### `package.json`

```json
{
  "name": "@sinaicamps/plugin-my-plugin",
  "version": "1.0.0",
  "description": "Descriptive name (used as fallback display name in DB seed)",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "sinaicamps": {
    "capabilities": ["database", "hooks", "routes", "ui"]
  },
  "devDependencies": {
    "@sinaicamps/plugin-sdk": "*"
  }
}
```

| Field                     | Required | Description                                               |
| ------------------------- | -------- | --------------------------------------------------------- |
| `name`                    | Yes      | npm-style package name                                    |
| `description`             | No       | Used as display name by the filesystem DB seeder          |
| `sinaicamps.capabilities` | No       | Array of capabilities the plugin uses. Omit to grant all. |

### Entry Point — `src/index.ts`

```typescript
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export default async function init(api: PluginAPI): Promise<void> {
  // Your plugin logic here
}
```

The `init` function receives the **only** object a plugin should ever touch.
Plugins must **never** import from `@/lib/...` or `../../../src/...`.

## Capabilities

Declare only the capabilities your plugin actually uses:

| Capability     | What it unlocks                                                                   |
| -------------- | --------------------------------------------------------------------------------- |
| `database`     | `api.db.getTable()`, `api.db.query()`, `api.db.execute()`, `api.db.createTable()` |
| `network`      | Outbound HTTP requests (via `fetch`)                                              |
| `payment`      | `api.services.payment.initiatePayment()`                                          |
| `notification` | `api.services.notification.send()`                                                |
| `hooks`        | `api.registerHook()`, `api.hooks.register()`, `api.executeHook()`                 |
| `routes`       | `api.registerRoute(path, handler)`                                                |
| `auth`         | `api.auth.getSession(req)`                                                        |
| `events`       | `api.publish()`, `api.subscribe()`, `api.events.emit()`                           |
| `ui`           | `api.ui.registerSlot()`, `api.ui.addMenuItem()`, `api.ui.addDashboardWidget()`    |
| `storage`      | (future) File upload / download                                                   |

## Registering Routes

```typescript
// Handler object with method-name keys:
api.registerRoute('/api/p/my-plugin/items', {
  GET: async (req) => {
    /* list */
  },
  POST: async (req) => {
    /* create */
  },
});
```

Route paths are registered exactly as given. Follow the convention
`/api/p/<plugin-id>/...` to avoid collisions with other plugins.

## Registering UI Slots

```typescript
// In your init function:
api.ui.addSlotComponent('admin.settings.tabs', 'my-plugin:SettingsTab');

// In ui.tsx, export a named component:
export function SettingsTab() { return <div>...</div>; }
export const components = { SettingsTab };
```

Standard slot names:

| Slot                    | Location                       |
| ----------------------- | ------------------------------ |
| `public.homepage`       | Homepage sections              |
| `public.search`         | Search / listings overview     |
| `public.listing-detail` | Single listing detail page     |
| `public.booking`        | Booking / reservation widget   |
| `manager.bookings`      | Property manager booking panel |
| `master.listings`       | Master admin listing table     |
| `manage.property`       | Property settings / edit form  |
| `guest.dashboard`       | Guest dashboard panels         |
| `guest.dashboard.cards` | Guest dashboard stat cards     |
| `admin.settings.tabs`   | Global settings tabs           |
| `dashboard.top`         | Dashboard banners / alerts     |
| `dashboard.widgets`     | Dashboard info widgets         |

## Registering Hooks

```typescript
api.registerHook(
  'PAYMENT_ON_SUCCESS',
  async (data) => {
    // React to payment — return modified data
    return data;
  },
  20 /* priority — lower runs first */
);
```

Hook names are conventionally UPPER_SNAKE_CASE. Both `api.registerHook()` and `api.hooks.register()` work identically.

Standard hook names:

| Hook                 | Data Shape                                                    | When Fires                  |
| -------------------- | ------------------------------------------------------------- | --------------------------- |
| `BOOKING_CREATED`    | `{ reservationId, propertyId, guestName, checkIn, checkOut }` | After booking confirmed     |
| `CHECKIN_COMPLETED`  | `{ reservationId, guestName, roomId, checkedInAt }`           | Guest checked in            |
| `CHECKOUT_COMPLETED` | `{ reservationId, guestName, roomId, totalCharges }`          | Guest checked out           |
| `LISTING_CREATED`    | `{ listingId, slug, ownerId }`                                | New listing created         |
| `LISTING_UPDATED`    | `{ listingId, slug, changes }`                                | Listing details changed     |
| `NOTIFICATION_SEND`  | `{ type, guestId, channel }`                                  | When notification scheduled |

## Accessing the Database

```typescript
// Use the scoped repository pattern:
const items = api.db.getTable<Item>('items');
const all = await items.findMany();
const one = await items.findById('id-1');
const created = await items.create({ name: 'New' });
const updated = await items.update('id-1', { name: 'Changed' });
await items.delete('id-1');

// Or use raw SQL (table names are auto-prefixed):
await api.db.createTable('my_table', `id TEXT PRIMARY KEY, ...`);
await api.db.query('SELECT * FROM plugin_my_plugin_my_table WHERE ...');
await api.db.execute('INSERT INTO plugin_my_plugin_my_table ...');

// Transactions:
await api.db.transaction(async (tx) => {
  await tx.execute('INSERT INTO ...');
  await tx.execute('UPDATE ...');
});
```

All tables created via `api.db.createTable()` are automatically namespaced
with `plugin_<pluginId>_` to prevent collisions.

## Idempotency Helpers

For webhook handlers that may receive duplicate events, use the built-in idempotency helpers
(available on `PluginAPI` without any capability declaration):

```typescript
// At the top of your webhook handler:
const key = `my-webhook-${eventId}`;
const cached = await api.checkIdempotency(key);
if (cached) {
  return Response.json(cached, { status: 200 });
}

// ... process the event ...

// Store the result before returning:
await api.storeIdempotency(key, { status: 'completed', id: recordId });
```

Keys are auto-expired by the system; no TTL management is needed.

## Configuration & Environment

Access environment variables via `process.env` or `api.config`:

```typescript
const apiKey = process.env.MY_PLUGIN_API_KEY || api.config.myPluginApiKey || '';
```

Per-property configuration is stored in `property_plugins.config` (JSON) and surfaced via `api.config`
when the plugin is loaded for a specific property.

## Inter-Plugin Communication

```typescript
// In plugin A — expose a public API:
return {
  myFunction: async (arg) => {
    /* ... */
  },
};

// In plugin B — consume it:
const pluginA = api.plugins.get('plugin-a');
if (pluginA) {
  await pluginA.myFunction(arg);
}
```

## Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockPluginAPI } from '../../packages/plugin-testing/src/index.js';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import init from '../src/index.js';

describe('my-plugin', () => {
  it('registers hooks', async () => {
    const api = createMockPluginAPI('my-plugin') as PluginAPI;
    api.registerHook = vi.fn(api.registerHook);
    await init(api);
    expect(api.registerHook).toHaveBeenCalledWith('BOOKING_CREATED', expect.any(Function));
  });
});
```

## Rules Summary

1. **Default export only** — `export default async function init(api)`.
2. **No core imports** — never import from `@/lib/` or `../../../src/`.
3. **Declare capabilities** — only what you use.
4. **Use `api.db.getTable()`** — not raw SQL against core tables.
5. **Do not modify core tables** — `properties`, `users`, etc. are owned by the framework.
6. **Register, don't hardcode** — use `api.registerRoute()`, `api.ui.addSlotComponent()`, etc.
7. **No `.js` + `.ts` duplicates** — source is `.ts`, build output goes to `dist/`.
8. **Both `plugin.json` and `package.json` required** — one for DB discovery, one for runtime loading.
9. **Use `api.checkIdempotency()` / `api.storeIdempotency()`** for safe webhook retries — they wrap the `idempotency_keys` table.
