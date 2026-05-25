# Plugin Development Guide

## Overview

SinaiCamps uses a modular plugin architecture. Each plugin is an independent module that extends the platform with database tables, API routes, UI components, and event hooks.

## Quick Start

### Prerequisites

- Node.js 18+
- TypeScript knowledge
- Understanding of Next.js App Router
- Clone the repository: `git clone https://github.com/Michaelhehelmy/campops-marketplace.git`

### Scaffold a Plugin

```
mkdir -p plugins/my-plugin/src
```

Required file structure:

```
plugins/my-plugin/
├── plugin.json          # Manifest (REQUIRED for PluginLoader)
├── package.json         # Node package
├── src/
│   ├── index.ts        # Entry point with default export init(api)
│   ├── routes.ts       # API route handlers
│   ├── ui.tsx          # React components (optional)
│   └── hooks.ts        # Hook handlers (optional)
├── __tests__/
│   └── index.test.ts   # Tests
└── migrations/         # SQL migrations (optional)
    └── 001_initial.sql
```

### Plugin Manifest (`plugin.json`)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Your Name",
  "license": "MIT",
  "entry": "src/index.ts",
  "ui": {
    "slots": {
      "manager.dashboard": "MyWidget"
    }
  },
  "hooks": {
    "consumes": ["BOOKING_CREATED", "CHECKIN_COMPLETED"],
    "emits": ["MY_PLUGIN_EVENT"]
  }
}
```

### Entry Point (`src/index.ts`)

```typescript
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export default async function init(api: PluginAPI) {
  // 1. Create tables
  await api.db.createTable('items', `
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  `);

  // 2. Create indexes
  await api.db.execute(`
    CREATE INDEX IF NOT EXISTS idx_my_plugin_items_property
    ON plugin_my_plugin_items(property_id)
  `);

  // 3. Register routes
  api.registerRoute('/api/p/my-plugin', {
    GET: async (req) => {
      const session = await api.auth.getSession(req);
      if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      // ...
      return Response.json({ items: [] });
    },
    POST: async (req) => {
      const session = await api.auth.getSession(req);
      if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      // ...
      return Response.json({ success: true }, { status: 201 });
    },
  });

  // 4. Register UI components
  api.ui.addSlotComponent('manager.dashboard', 'my-plugin:MyWidget');

  // 5. Register hooks
  api.registerHook('BOOKING_CREATED', async (data) => {
    api.logger.info('Booking created:', data.bookingId);
  });
}
```

## Plugin SDK Reference

### Database

```typescript
// Create a table (auto-prefixed with plugin_{id}_)
api.db.createTable('items', `id TEXT PRIMARY KEY, ...`);

// Execute SQL
api.db.execute('INSERT INTO plugin_my_plugin_items (id, name) VALUES (?, ?)', [id, name]);

// Query
const items = await api.db.query('SELECT * FROM plugin_my_plugin_items WHERE property_id = ?', [propId]);

// Transaction
await api.db.transaction(async (trx) => {
  await trx.execute('INSERT INTO ...', [val1]);
  await trx.execute('UPDATE ...', [val2]);
});
```

### Routes

```typescript
api.registerRoute('/api/p/my-plugin', {
  GET: async (req: Request) => { ... },
  POST: async (req: Request) => { ... },
  PATCH: async (req: Request) => { ... },
  DELETE: async (req: Request) => { ... },
});
```

Route path follows: `/api/p/{plugin-id}[/optional-path]`

### Auth

Every route MUST check authentication:

```typescript
const session = await api.auth.getSession(req);
if (!session) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
// session.user.role can be checked for RBAC
```

### UI Components

```typescript
// Register a component for a slot
api.ui.addSlotComponent('manager.dashboard', 'my-plugin:MyWidget');
api.ui.addSlotComponent('public.booking', 'my-plugin:BookingWidget');

// Available slots:
// manager.dashboard  - Property manager dashboard
// owner.dashboard    - Owner dashboard
// admin.settings      - Master admin settings
// public.booking     - Public booking widget
// guest.dashboard     - Guest dashboard
// staff.checkins      - Staff check-in panel
```

### Hooks

```typescript
// Consume (listen to) events
api.registerHook('BOOKING_CREATED', async (data) => {
  // data: { bookingId, propertyId, guestEmail, guestName, checkIn, checkOut, roomId, totalPrice }
});

api.registerHook('CHECKIN_COMPLETED', async (data) => {
  // data: { bookingId, roomId, guestName }
});

api.registerHook('CHECKOUT_COMPLETED', async (data) => {
  // data: { bookingId, roomId }
});
```

### Table Naming Convention

`api.db.createTable('items', ...)` creates a table named `plugin_{plugin_id}_{items}`.

Plugin IDs with hyphens are converted: `my-plugin` → `plugin_my_plugin_items`.

**Important**: All route queries MUST reference the prefixed table name.

## Testing

### Test File Structure

```typescript
// plugins/my-plugin/__tests__/index.test.ts
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import init from '../src/index';

function createMockAPI() {
  const tables: string[] = [];
  return {
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    db: {
      createTable: vi.fn(async (name: string) => { tables.push(name); }),
      execute: vi.fn(async () => {}),
      query: vi.fn(async () => []),
      transaction: vi.fn(async (fn: any) => fn({ execute: vi.fn() })),
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

describe('My Plugin', () => {
  it('should initialize without errors', async () => {
    const api = createMockAPI();
    await expect(init(api)).resolves.not.toThrow();
  });

  it('should create database tables', async () => {
    const api = createMockAPI();
    await init(api);
    expect(api.db.createTable).toHaveBeenCalled();
  });

  it('should register routes', async () => {
    const api = createMockAPI();
    await init(api);
    expect(api.registerRoute).toHaveBeenCalled();
  });
});
```

### Testing Auth

```typescript
// Test unauthorized access
api.auth.getSession = vi.fn().mockResolvedValue(null);

// Test different roles
api.auth.getSession = vi.fn().mockResolvedValue({
  user: { id: 'test', role: 'manager-tenant', email: 'mgr@test.com' },
});
```

## Best Practices

### Security
- Always check `api.auth.getSession()` at the start of every route
- Never use string interpolation in SQL — always use `?` parameters
- Validate all input with Zod schemas
- Use transactions for multi-step operations

### Performance
- Create indexes for frequently queried columns in `init()`
- Use pagination (limit/offset) for list endpoints
- Cache expensive computations
- Add indexes in `init()` via `api.db.execute('CREATE INDEX IF NOT EXISTS ...')`

### Error Handling
- Return proper HTTP status codes (400, 401, 403, 404, 500)
- Wrap errors in `{ error, message }` response shape
- Use `api.logger.error()` for server-side logging
- Never expose internal errors to users

### Database
- Always include `created_at` and `updated_at` columns
- Use `property_id` for tenant scoping
- Create rollback SQL for migrations

### Routing
- Use `api.registerRoute()` for plugin-specific routes
- Use `?section=` query param pattern for multi-resource plugins
- Follow URL structure: `/api/p/{plugin-id}/{resource}`

## Git Commit Convention

```
feat(plugin-name): description
fix(plugin-name): description
docs: description
test: description
```

## Resources

- [Existing Plugins](../../plugins/) — Study these for patterns
- [Plugin SDK Types](../../packages/plugin-sdk/src/) — TypeScript interfaces
- [Plugin Development Guide](./PLUGIN_DEVELOPER_GUIDE.md) — Full reference
