# CampOps Plugin Ecosystem

> Plugin marketplace, SDK, and extension library for the CampOps platform. Now integrated into the main marketplace repository.

## Overview

This directory contains all plugins, the plugin SDK, and documentation for extending CampOps functionality. Previously a separate repository (`campops-ecosystem`), now unified within `campops-marketplace`.

## Directory Structure

```
campops-marketplace/
├── plugins/                    # Built-in & community plugins
│   ├── activities/             # Activity booking management
│   ├── booking/                # Core booking engine
│   ├── financial-ops/          # Financial operations
│   ├── guest-crm/              # Guest relationship management
│   ├── housekeeping/           # Housekeeping management
│   ├── ical/                   # iCal feed export
│   ├── ical-import/            # iCal feed import
│   ├── inventory-waste/        # Inventory & waste tracking
│   ├── loyalty/                # Guest loyalty program
│   ├── ota-channel-manager/     # OTA channel management
│   ├── pos-kds/                # POS & Kitchen Display
│   ├── siteminder/             # SiteMinder integration
│   ├── staff-roster/           # Staff roster management
│   └── test-dock/              # Plugin testing environment
│
├── packages/
│   ├── plugin-sdk/             # TypeScript SDK for plugin development
│   ├── plugin-starter/         # Starter template for new plugins
│   └── shared/                 # Shared hooks & utilities
│
└── docs/plugins/               # Plugin documentation
    ├── plugin-development.md   # Full development tutorial
    ├── hook-catalog.md         # All available hooks
    ├── n8n-workflows.md        # n8n automation workflows
    └── submission-guidelines.md
```

## Available Plugins

| Plugin                 | Description                           | Status     |
| ---------------------- | ------------------------------------- | ---------- |
| `accounting`           | Enterprise general ledger & invoicing | 🏗️ Planned |
| `activities`           | Activity & excursion booking          | ✅ Ready   |
| `booking`              | Core reservation engine               | ✅ Ready   |
| `financial-ops`        | Payments & financial tracking         | ✅ Ready   |
| `guest-crm`            | Guest profiles & preferences          | ✅ Ready   |
| `housekeeping`         | Room cleaning schedules               | ✅ Ready   |
| `hr-core`              | Employee & payroll management         | 🏗️ Planned |
| `ical`                 | Export bookings to iCal               | ✅ Ready   |
| `ical-import`          | Import external iCal feeds            | ✅ Ready   |
| `inventory-waste`      | Stock & waste management              | ✅ Ready   |
| `loyalty`              | Points & rewards program              | ✅ Ready   |
| `maintenance`          | Asset & facility maintenance          | 🏗️ Planned |
| `marketing-automation` | Campaigns & guest segmentation        | 🏗️ Planned |
| `ota-channel-manager`  | Channel manager integration           | ✅ Ready   |
| `pos-kds`              | Point of sale & kitchen display       | ✅ Ready   |
| `siteminder`           | SiteMinder OTA sync                   | ✅ Ready   |
| `staff-roster`         | Employee scheduling                   | ✅ Ready   |
| `subscriptions`        | Seasonal & membership billing         | 🏗️ Planned |
| `test-dock`            | Plugin testing environment            | ✅ Ready   |

## Quick Start - Build a Plugin

```bash
# 1. Copy the starter template
cd campops-marketplace
cp -r packages/plugin-starter plugins/my-plugin
cd plugins/my-plugin

# 2. Install dependencies
npm install

# 3. Link the SDK
npm link ../../packages/plugin-sdk

# 4. Start development
npm run dev
```

## Plugin Architecture

### Basic Plugin Structure

```
plugins/my-plugin/
├── plugin.json           # Plugin manifest
├── package.json          # Dependencies
├── src/
│   ├── index.ts         # Main entry point
│   └── routes/          # API routes (optional)
└── migrations/          # Database migrations (optional)
```

### Plugin Manifest (`plugin.json`)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does awesome things",
  "author": "Your Name",
  "entry": "src/index.ts",
  "hooks": ["booking:created", "guest:checkin"],
  "permissions": ["read:bookings", "write:guests"]
}
```

### Plugin Entry Point

```typescript
// src/index.ts
import { CampOpsPlugin, HookContext } from 'campops-sdk';

const plugin: CampOpsPlugin = {
  id: 'my-plugin',

  async init(context) {
    // Register hooks
    context.onHook('booking:created', async (ctx: HookContext) => {
      console.log('New booking!', ctx.payload);
    });

    // Add routes
    context.addRoute('GET', '/my-plugin/status', async (req, res) => {
      return { status: 'ok' };
    });
  },

  async destroy() {
    // Cleanup
  },
};

export default plugin;
```

## Plugin SDK (`packages/plugin-sdk`)

The SDK provides TypeScript types, hooks, and utilities for plugin development.

### Installation

```bash
cd packages/plugin-sdk
npm install
npm run build
```

### Key Types

- `CampOpsPlugin` - Main plugin interface
- `HookContext` - Context passed to hook handlers
- `PluginContext` - Context provided during init
- `RouteHandler` - API route handler type

## API Integration

### Registering Routes

```typescript
context.addRoute('GET', '/my-plugin/data', async (req, res) => {
  const data = await db.query('SELECT * FROM my_table');
  return { data };
});
```

### Database Access

```typescript
const db = context.getDatabase();
await db.query('INSERT INTO logs (message) VALUES ($1)', ['Hello']);
```

### Calling Other Plugins

```typescript
const stripePlugin = context.getPlugin('stripe');
const result = await stripePlugin.createPayment(amount, currency);
```

## Available Hooks

See `docs/plugins/hook-catalog.md` for complete list.

### Booking Hooks

- `booking:created` - New reservation created
- `booking:updated` - Reservation modified
- `booking:cancelled` - Reservation cancelled
- `booking:confirmed` - Payment confirmed

### Guest Hooks

- `guest:checkin` - Guest arrived
- `guest:checkout` - Guest departed
- `guest:profile:updated` - Profile changed

### Room Hooks

- `room:assigned` - Room assigned to booking
- `room:status:changed` - Room status update

## Testing Plugins

```bash
# Using the test-dock plugin
cd plugins/test-dock
npm test

# Or run specific plugin tests
cd plugins/my-plugin
npm test
```

## Documentation

- `docs/plugins/plugin-development.md` - Full tutorial
- `docs/plugins/hook-catalog.md` - All hooks reference
- `docs/plugins/n8n-workflows.md` - Automation workflows
- `docs/plugins/submission-guidelines.md` - Publish your plugin

## Submitting a Plugin

1. Build your plugin in `plugins/your-plugin/`
2. Ensure all tests pass
3. Update `PLUGINS_ECOSYSTEM.md` with your plugin info
4. Submit PR to marketplace repository

## Migration from Separate Ecosystem Repo

This ecosystem was previously in `campops-ecosystem/`. It has been consolidated into `campops-marketplace/` for unified development.

### Changes:

- **Old**: `campops-ecosystem/plugins/`
- **New**: `campops-marketplace/plugins/`

- **Old**: `campops-ecosystem/packages/`
- **New**: `campops-marketplace/packages/`

- **Old**: `campops-ecosystem/docs/`
- **New**: `campops-marketplace/docs/plugins/`

## License

Part of CampOps Marketplace - Internal use only
