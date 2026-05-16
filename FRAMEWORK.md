# SinaiCamps — Core Framework Guide

This document describes the **generic core framework** that powers SinaiCamps Marketplace.
The core is intentionally domain-agnostic; all business logic lives in plugins.

---

## Architecture Overview

```
core/
  src/
    db/schema.ts          ← Generic tables only (users, tenants, plugins)
    lib/db.ts             ← SQLite wrapper (DrizzleDatabaseWrapper)
    lib/PluginAPI.ts      ← Plugin API factory (makePluginAPI)
    lib/hooks.ts          ← Generic hook constants + HookManager
    lib/PluginRouteRegistry.ts  ← Plugin-registered HTTP routes
    lib/auth.ts           ← Better Auth integration
    middleware.ts         ← Tenant routing + auth checks
    app/api/
      auth/               ← Auth endpoints (keep)
      plugins/            ← Plugin management endpoints (keep)
      tenant/             ← Tenant resolution (keep)
      admin/              ← Admin infrastructure (keep)
      master/stats        ← Generic platform stats (keep)
      manage/[id]/plugins ← Plugin enable/disable per tenant (keep)

plugins/                  ← All domain logic lives here
  booking/
  crm/
  loyalty/
  ...
```

---

## Core Database Schema

Only these tables are owned by the core framework:

| Table (SQLite)       | Drizzle symbol     | Purpose                   |
| -------------------- | ------------------ | ------------------------- |
| `users`              | `users`            | Auth users                |
| `sessions`           | `sessions`         | Auth sessions             |
| `accounts`           | `accounts`         | OAuth accounts            |
| `verifications`      | `verifications`    | Email verification tokens |
| `user_roles`         | `userRoles`        | RBAC role assignments     |
| `available_plugins`  | `availablePlugins` | Plugin registry           |
| `profiles`           | `profiles`         | User profiles             |
| `properties`\*       | `tenants`          | Registered tenants        |
| `property_staff`\*   | `tenantStaff`      | Tenant staff assignments  |
| `property_plugins`\* | `tenantPlugins`    | Tenant plugin assignments |

\* The underlying SQLite table names retain their old names (`properties`, `property_staff`,
`property_plugins`) for backward-compatibility. Use the new Drizzle symbols (`tenants`,
`tenantStaff`, `tenantPlugins`) in new code.

### What does NOT belong in core schema

Domain-specific tables (`rooms`, `reservations`, `bookings`, `commission_rates`, etc.)
are created at runtime by their owning plugins via `api.db.createTable()`.

---

## Plugin API Contract

Every plugin receives a `PluginAPI` instance via `makePluginAPI(pluginId, tenantId?)`.

```typescript
import { makePluginAPI } from '@/lib/PluginAPI';

const api = makePluginAPI('my-plugin', 'tenant-id');

// Logging
api.log.info('Hello from my-plugin');

// Hooks
api.hooks.registerHook(Hooks.TRANSACTION_CREATED, async (data) => { ... });
await api.hooks.executeHook(Hooks.TRANSACTION_CREATED, { orderId: '...' });

// Database — generic
const rows = await api.db.query('SELECT * FROM my_custom_table WHERE tenant_id = ?', [id]);

// Database — plugin-scoped table
const repo = api.db.getTable<MyRow>('orders');   // → plugin_my_plugin_orders
const items = await repo.findMany({ status: 'pending' });
await repo.create({ status: 'pending', amount: 100 });
await repo.update('row-id', { status: 'confirmed' });
await repo.delete('row-id');

// Create/drop plugin-owned tables
await api.db.createTable('orders', 'amount INTEGER NOT NULL, status TEXT DEFAULT \'pending\'');
await api.db.dropTable('orders');
const exists = await api.db.tableExists('orders');

// HTTP routes
api.registerRoute('/orders', { GET: listOrders, POST: createOrder });

// UI slots
api.ui.registerSlot('dashboard.top', MyWidget);
api.ui.registerMenuItem({ id: 'orders', label: 'Orders', href: '/orders' });
```

### Plugin Table Naming Convention

All plugin-created tables are prefixed `plugin_<pluginId>_<suffix>`:

| Plugin ID | Table suffix | Full table name         |
| --------- | ------------ | ----------------------- |
| `booking` | `rooms`      | `plugin_booking_rooms`  |
| `crm`     | `contacts`   | `plugin_crm_contacts`   |
| `loyalty` | `points`     | `plugin_loyalty_points` |

`api.db.getTable(suffix)` handles the prefix automatically.

---

## Hook Constants

Generic hook names are defined in `src/lib/hooks.ts`:

| Constant                    | Event string          | Use when                               |
| --------------------------- | --------------------- | -------------------------------------- |
| `Hooks.TRANSACTION_CREATED` | `transaction:created` | Any order/booking/purchase was created |
| `Hooks.ENTITY_DEPARTED`     | `entity:departed`     | A user/guest/entity left               |
| `Hooks.RESOURCE_PAGE_LOAD`  | `resource:page_load`  | A listing/resource page was viewed     |
| `Hooks.PAYMENT_ON_SUCCESS`  | `payment:success`     | Payment completed successfully         |
| `Hooks.PRICING_CALCULATE`   | `pricing:calculate`   | Price calculation requested            |
| `Hooks.NOTIFICATION_SEND`   | `notification:send`   | Notification dispatch requested        |

Deprecated aliases (`BOOKING_CREATED`, `GUEST_CHECKED_OUT`, `LISTING_PAGE_LOAD`) still
exist but map to the same event strings and will be removed in v3.

Plugins are encouraged to define additional domain-specific hook strings as plain
string constants in their own codebase.

---

## Middleware

`src/middleware.ts` handles:

- **Locale routing** — `next-intl` prefix
- **Tenant resolution** — subdomain/custom domain → `tenantId` header
- **Auth guard** — redirects unauthenticated users away from `/manage`, `/owner`, etc.
- **Role-based access** — staff cannot access `/finance`, `/settings`, `/plugins`
- **Slug rewrite** — unknown paths are rewritten to `/resource/<slug>` for the generic
  resource detail page shell

Domain-specific paths have been removed. The reserved path `/list-your-camp` has been
superseded by `/list-your-space` (generic onboarding), and `/stay` rewrites now go to
`/resource`.

---

## Adding a New Plugin

1. Create `plugins/<my-plugin>/src/index.ts`:

```typescript
import type { PluginAPI } from 'plugin-sdk';

export default async function init(api: PluginAPI) {
  await api.db.createTable('my_entities', "name TEXT NOT NULL, status TEXT DEFAULT 'active'");

  api.registerRoute('/my-entities', { GET: list, POST: create });
  api.ui.registerSlot('dashboard.top', MyWidget);
  api.hooks.registerHook('transaction:created', async (data) => {
    await api.log.info('Transaction created:', data);
  });

  return { list, create };
}
```

2. Add `plugin.json` manifest with `slots`, `menuItems`, `routes`.
3. Register in `available_plugins` table (or via the master admin UI).
4. Enable for a tenant via `/api/manage/<tenantId>/plugins`.

---

## Removed from Core (moved to plugins)

The following were removed from `src/db/schema.ts` and `src/lib/PluginAPI.ts`:

| What                        | Was          | Now                                   |
| --------------------------- | ------------ | ------------------------------------- |
| `marketplaceBookings` table | core schema  | booking/financial plugin              |
| `commissionRates` table     | core schema  | financial-ops plugin                  |
| `reservations` table        | core schema  | booking plugin                        |
| `roomTypes` table           | core schema  | booking plugin                        |
| `api.db.rooms`              | SDK shortcut | use `api.db.getTable('rooms')`        |
| `api.db.reservations`       | SDK shortcut | use `api.db.getTable('reservations')` |
| `api.db.guests`             | SDK shortcut | use `api.db.getTable('guests')`       |
| `api.db.folios`             | SDK shortcut | use `api.db.getTable('folios')`       |
| `api.db.roomTypes`          | SDK shortcut | use `api.db.getTable('room_types')`   |
| `/api/public/book`          | core route   | booking plugin (`@deprecated`)        |
| `/api/manage/[id]/bookings` | core route   | booking plugin (`@deprecated`)        |
| `/api/guest/reservations`   | core route   | booking plugin (`@deprecated`)        |
| Booking-specific stats      | master/stats | booking plugin dashboard widget       |

Deprecated core routes still exist and still pass their tests; they will be deleted
once the booking plugin's routes are stable.
