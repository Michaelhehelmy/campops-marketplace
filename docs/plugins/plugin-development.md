# Plugin Development — Full Tutorial

This guide walks you through building a complete SinaiCamps plugin from scratch, covering the full Plugin API surface.

---

## Prerequisites

- Node.js 20+
- A running Acacia Camp instance (for testing)
- Basic TypeScript knowledge

---

## Step 1 — Create your plugin

```bash
cp -r packages/plugin-starter plugins/my-plugin
cd plugins/my-plugin
npm install
```

Directory structure:

```
plugins/my-plugin/
├── plugin.json         ← Plugin metadata & registry
├── package.json        ← Node.js manifest
├── tsconfig.json       ← TypeScript config
└── src/
    ├── index.ts        ← Backend entry point (API, hooks)
    ├── ui.tsx          ← Frontend components (Widgets, Settings)
    └── index.test.ts   ← Unit tests
```

---

## Step 2 — Configure `plugin.json`

The `plugin.json` is the source of truth for the platform to discover your plugin's capabilities.

```json
{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does something incredible",
  "author": "Your Name",
  "category": "Operations",
  "entry": "src/index.ts",
  "uiEntry": "src/ui.tsx",
  "slots": {
    "dashboard.widgets": ["my-plugin:MyStatWidget"]
  },
  "menuItems": [
    {
      "id": "my-page",
      "label": "My Page",
      "path": "/admin/my-page",
      "order": 50
    }
  ]
}
```

---

## Step 3 — Implement `init()`

Every plugin exports a single default function:

```typescript
// src/index.ts
import type { PluginAPI } from 'sinaicamps-sdk';

export default function init(api: PluginAPI): void | Promise<void> {
  // Your plugin logic here
}
```

The function is called once at server startup with a fully-scoped `PluginAPI` instance.

---

## Step 3 — Use the API

### Logging

```typescript
api.logger.info('Plugin started');
api.logger.warn('Something looks off', { key: 'value' });
api.logger.error('Failed to connect', error);
api.logger.debug('Processing item', { id: '123' });
```

All log messages are automatically prefixed with `[my-plugin]`.

### Reading your config

```typescript
const apiKey = api.config.API_KEY; // from plugin-manifest.json config block
const webhookSecret = api.config.WEBHOOK_SECRET;
```

Config values starting with `${VAR}` in the manifest are resolved from environment variables.

### Registering hooks

```typescript
// Return the (optionally modified) data object
api.registerHook('booking.created', async (data, ctx) => {
  console.log(`New booking for property ${ctx.propertyId}`);
  // data.guestName, data.checkIn, data.checkOut, data.totalAmount, etc.
  return data;
});

// Modify pricing
api.registerHook('pricing.calculate', async (data, ctx) => {
  if (data.promoCode === 'CAMP10') {
    return { ...data, baseAmount: data.baseAmount * 0.9 };
  }
  return data;
});
```

Hook handlers are called in **priority order** (lower number = earlier). Default priority is 10.

```typescript
api.registerHook('booking.created', handler, 1); // runs before priority-10 handlers
```

### Database access

All DB operations are **automatically scoped to the current property** — no need to add `WHERE property_id` yourself:

```typescript
// Find all available rooms
const rooms = await api.db.rooms.findMany({ status: 'available' });

// Get a reservation by ID
const reservation = await api.db.reservations.findById(reservationId);

// Create a new record
const guest = await api.db.guests.create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Update
await api.db.reservations.update(id, { status: 'confirmed' });

// Delete
await api.db.reservations.delete(id);
```

Available repositories: `rooms`, `reservations`, `guests`, `folios`, `roomTypes`.

### Sending notifications

```typescript
await api.services.notification.send({
  to: 'guest@example.com',
  channel: 'email', // "email" | "sms" | "whatsapp"
  subject: 'Your booking is confirmed',
  body: 'Hi Jane, your stay at Acacia Camp is confirmed for 15 Dec.',
  metadata: { bookingId: 'abc123' },
});
```

### Processing payments

```typescript
const result = await api.services.payment.initiatePayment(orderId, 150.0, 'USD', {
  gateway: 'stripe',
  description: 'Booking deposit',
});
// result.paymentUrl — redirect the user here
// result.transactionId — store for later reference
```

### Calculating taxes

```typescript
const { taxes, totalTax } = await api.services.tax.calculateTaxes(
  100.0, // base amount
  ctx.propertyId // property context
);
// taxes: [{ name: "VAT", rate: 0.15, amount: 15 }]
// totalTax: 15
```

### Real-time pub/sub

```typescript
// Publish an event (e.g., order ready for KDS display)
api.publish('order.ready', { orderId: '123', tableNumber: 4 });

// Subscribe (runs on every message while server is up)
const unsubscribe = api.subscribe('order.ready', (msg) => {
  console.log(`Order ${msg.orderId} ready for table ${msg.tableNumber}`);
});
```

### UI injection (Declarative)

Instead of imperative calls, UI elements are defined in `plugin.json` and components are exported from `src/ui.tsx`.

#### 1. Define in `plugin.json`

```json
{
  "slots": {
    "dashboard.widgets": ["my-plugin:MyStatWidget"]
  },
  "menuItems": [
    { "id": "my-feature", "label": "My Feature", "path": "/admin/my-feature", "order": 10 }
  ]
}
```

#### 2. Export in `src/ui.tsx`

```typescript
import React from "react";

export function MyStatWidget() {
  return <div>My Widget Content</div>;
}

export const components = {
  MyStatWidget
};
```

---

## Step 4 — Write tests

```typescript
// src/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './index.js';
import type { PluginAPI } from 'sinaicamps-sdk';

function createMockAPI(): PluginAPI {
  return {
    pluginId: 'my-plugin',
    version: '1.0.0',
    config: { API_KEY: 'test-key' },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    registerHook: vi.fn(),
    executeHook: vi.fn(),
    db: {
      rooms: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      reservations: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      guests: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      folios: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      roomTypes: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    services: {
      payment: { initiatePayment: vi.fn() },
      tax: { calculateTaxes: vi.fn() },
      notification: { send: vi.fn() },
      i18n: { t: vi.fn((k) => k) },
    },
    publish: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    ui: {
      addSlotComponent: vi.fn(),
      addMenuItem: vi.fn(),
      addDashboardWidget: vi.fn(),
      addSettingsPage: vi.fn(),
    },
  } as unknown as PluginAPI;
}

describe('my-plugin', () => {
  it('initialises without throwing', () => {
    const api = createMockAPI();
    expect(() => init(api)).not.toThrow();
  });

  it('registers the booking.created hook', () => {
    const api = createMockAPI();
    init(api);
    expect(api.registerHook).toHaveBeenCalledWith('booking.created', expect.any(Function));
  });
});
```

Run:

```bash
npm test
```

---

## Step 5 — Dev hot-reload

While your Acacia Camp backend is running:

```bash
npm run proxy
```

The `dev-proxy.js` script watches `src/` for changes, runs `tsc --noEmit`, and sends `POST /api/plugins/reload` to trigger a live reload without restarting the server.

---

## Step 6 — Register in Acacia Camp

Add to `plugin-manifest.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "sinaicampsVersion": ">=2.0.0",
  "path": "./plugins/my-plugin/src/index.ts",
  "enabled": true,
  "config": {
    "API_KEY": "${MY_PLUGIN_API_KEY}"
  }
}
```

Add the env var:

```env
MY_PLUGIN_API_KEY=your-api-key
```

Restart the server:

```bash
npm run dev:server
```

Confirm load:

```
[PluginLoader] ✓ Loaded plugin: my-plugin v1.0.0
```

---

## Tutorial: Payment Gateway Plugin

```typescript
import type { PluginAPI } from 'sinaicamps-sdk';

export default function init(api: PluginAPI) {
  api.registerHook('payment.initiated', async (data, ctx) => {
    // Call your payment provider's API
    const response = await fetch('https://api.mypayments.com/charge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${api.config.SECRET_KEY}` },
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
      }),
    });
    const result = await response.json();
    // Return enriched data — the core will use paymentUrl to redirect the guest
    return { ...data, paymentUrl: result.checkout_url, transactionId: result.id };
  });

  api.registerHook('payment.on_success', async (data, ctx) => {
    await api.services.notification.send({
      to: data.guestEmail,
      channel: 'email',
      subject: 'Payment received',
      body: `Payment of ${data.amount} ${data.currency} received. Ref: ${data.transactionId}`,
    });
    return data;
  });
}
```

---

## Tutorial: OTA Adapter Plugin

```typescript
import type { PluginAPI, OTAAdapter, ChannelReservation } from 'sinaicamps-sdk';

const adapter: OTAAdapter = {
  id: 'my-ota',
  name: 'My OTA Channel',

  async syncInventory(roomMappings) {
    // Push availability to the OTA
    for (const mapping of roomMappings) {
      await fetch(`https://api.myota.com/inventory/${mapping.channelRoomId}`, {
        method: 'PUT',
        body: JSON.stringify({ available: true }),
      });
    }
  },

  async syncRates(rateMappings) {
    /* ... */
  },

  async fetchReservations(since: Date): Promise<ChannelReservation[]> {
    const res = await fetch(`https://api.myota.com/reservations?since=${since.toISOString()}`);
    const data = await res.json();
    return data.reservations.map((r: any) => ({
      channelRef: r.id,
      roomId: r.room_id,
      guestName: r.guest_name,
      checkIn: new Date(r.check_in),
      checkOut: new Date(r.check_out),
      totalAmount: r.total,
      currency: r.currency,
      source: 'my-ota',
    }));
  },

  async cancelReservation(channelRef) {
    /* ... */
  },
};

export default function init(api: PluginAPI) {
  api.registerHook('ota.reservation_received', async (data, ctx) => {
    api.logger.info(`New OTA reservation: ${data.channelRef}`);
    return data;
  });
  // Register adapter with the OTA sync service
  // (api.services.ota is available in Phase 5+)
}
```
