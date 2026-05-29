# Hook Catalog

All hooks available to plugins, with their exact string values, payload shapes, and usage examples.

Hooks are **dynamic**: any string can be a hook name. Constants are provided for convenience.

Two registration styles:
- `api.registerHook(name, handler, priority?)` — pipeline hooks (output of one handler becomes input to the next)
- `api.hooks.addAction(name, handler, priority?)` — fire-and-forget, discards return values
- `api.hooks.applyFilters(name, value, context?)` — transforms value through all handlers

---

## Booking Hooks

### `BOOKING_CREATED`

**SDK constant:** `Hooks.BOOKING_CREATED` (`'BOOKING_CREATED'`) — available from `@sinaicamps/plugin-sdk`.

**Fired by:** `plugins/booking/src/api/routes.ts` — when a new reservation is confirmed.

**Listeners:** booking, financial-ops, accounting, marketing-automation, subscriptions, crm, integrations, loyalty

**Payload:**

```typescript
{
  bookingId: string;
  propertyId: string;
  guestId?: string;
  guestName: string;
  guestEmail?: string;
  roomId?: string;
  roomTypeName?: string;
  checkIn: string;       // ISO 8601
  checkOut: string;      // ISO 8601
  guestCount: number;
  totalAmount: number;
  currency: string;
  source: string;        // "internal" | "marketplace" | "ota"
  referenceNumber: string;
}
```

**Example:**

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.BOOKING_CREATED, async (data) => {
  api.logger.info(`Booking confirmed: ${data.referenceNumber}`);
  return data;
}, 20);
```

---

### `CHECKIN_COMPLETED`

**SDK constant:** No SDK constant exists (booking plugin–specific string). Reference as `'CHECKIN_COMPLETED'`.

**Fired by:** `plugins/booking/src/api/routes.ts` — when a guest is checked in.

**Listeners:** booking, hr-core

**Payload:**

```typescript
{
  reservationId: string;
  guestName: string;
  roomId: string;
  checkedInAt: string;   // ISO 8601
}
```

**Example:**

```typescript
api.registerHook('CHECKIN_COMPLETED', async (data) => {
  api.logger.info(`${data.guestName} checked in to room ${data.roomId}`);
  return data;
});
```

---

### `CHECKOUT_COMPLETED`

**SDK constant:** `Hooks.GUEST_CHECKED_OUT` (`'CHECKOUT_COMPLETED'`).

**Fired by:** `plugins/booking/src/api/routes.ts` — when a guest is checked out.

**Listeners:** booking, ical, loyalty, housekeeping (via `reservation:after_checkout`)

**Payload:**

```typescript
{
  reservationId: string;
  guestName: string;
  roomId: string;
  checkedOutAt: string;  // ISO 8601
  totalCharges: number;
  currency: string;
}
```

**Example:**

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.GUEST_CHECKED_OUT, async (data) => {
  api.logger.info(`${data.guestName} checked out`);
  return data;
});
```

---

### `BOOKING_CANCELLED`

**SDK constant:** No SDK constant exists. Reference as `'BOOKING_CANCELLED'`.

**Fired by:** `plugins/booking/src/hooks.ts` (via `SyncWaterfallHook`).

**Listeners:** integrations

**Payload:**

```typescript
{
  reservationId: string;
  cancelledAt: string;   // ISO 8601
  cancelledBy: string;   // user ID
  refundAmount?: number;
}
```

---

## Payment Hooks

### `payment:success`

**SDK constant:** `Hooks.PAYMENT_ON_SUCCESS` (`'payment:success'`).

**Fired by:** Not yet integrated in any plugin (SDK constant ready for use).

**Listeners:** paymob, loyalty

**Payload:**

```typescript
{
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  guestEmail?: string;
  paidAt: string;        // ISO 8601
}
```

**Example:**

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.PAYMENT_ON_SUCCESS, async (data) => {
  api.logger.info(`Payment of ${data.amount} ${data.currency} succeeded`);
  return data;
});
```

---

### `payment:collect_methods`

**SDK constant:** `Hooks.PAYMENT_COLLECT_METHODS` (`'payment:collect_methods'`).

**Fired by:** Not yet integrated (SDK constant ready for use).

**Listeners:** paymob

**Payload:**

```typescript
{
  orderId: string;
  amount: number;
  currency: string;
  guestEmail?: string;
  metadata?: Record<string, any>;
}
```

---

## Pricing Hooks

### `pricing:calculate`

**SDK constant:** `Hooks.PRICING_CALCULATE` (`'pricing:calculate'`).

**Fired by:** Not yet integrated (SDK constant ready for use).

**Listeners:** loyalty

**Payload:**

```typescript
{
  baseAmount: number;
  nights: number;
  guests: number;
  checkIn: string;       // ISO 8601
  checkOut: string;      // ISO 8601
  roomTypeId: string;
  ratePlanId?: string;
  promoCode?: string;
  currency: string;
}
```

**Example — 10% promo discount:**

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.PRICING_CALCULATE, async (data) => {
  if (data.promoCode === 'CAMP10') {
    return { ...data, baseAmount: Math.round(data.baseAmount * 0.9 * 100) / 100 };
  }
  return data;
});
```

---

## Generic Reservation Hooks

### `reservation:after_create`

**SDK constant:** `Hooks.RESERVATION_AFTER_CREATE` (`'reservation:after_create'`).

**Fired by:** Not yet wired to booking plugin (generic phase-3 name).

**Listeners:** ical, guest-crm

**Payload:**

```typescript
{
  id: string;
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail?: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currency: string;
}
```

**Example:**

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

api.registerHook(Hooks.RESERVATION_AFTER_CREATE, async (data) => {
  api.publish('reservation:created', { reservationId: data.id, roomId: data.roomId });
  return data;
});
```

### `reservation:after_cancel`

**SDK constant:** `Hooks.RESERVATION_AFTER_CANCEL` (`'reservation:after_cancel'`).

**Fired by:** Not yet wired (generic phase-3 name).

**Listeners:** ical

**Payload:** Same shape as `reservation:after_create`.

---

## POS Hooks

### `pos:order_completed`

**SDK constant:** `Hooks.POS_ORDER_COMPLETED` (`'pos:order_completed'`).

**Fired by:** Not yet integrated (SDK constant ready for use).

**Listeners:** None currently.

**Payload:**

```typescript
{
  orderId: string;
  items: { name: string; qty: number; price: number }[];
  totalAmount: number;
  currency: string;
  createdBy: string;
}
```

---

## FOLIO Hooks

### `folio:pre_add_charge`

**SDK constant:** `Hooks.FOLIO_PRE_ADD_CHARGE` (`'folio:pre_add_charge'`).

**Fired by:** Not yet integrated (SDK constant ready for use).

**Listeners:** None currently.

**Payload:**

```typescript
{
  folioId: string;
  guestId: string;
  amount: number;
  description: string;
  category: string;
}
```

---

## Notification Hooks

### `notification:send`

**SDK constant:** `Hooks.NOTIFICATION_SEND` (`'notification:send'`).

**Fired by:** loyalty plugin (when sending points-awarded notification).

**Listeners:** None currently.

**Payload:**

```typescript
{
  channel: 'email' | 'sms' | 'whatsapp';
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}
```

---

## UI / Filter Hooks

### `admin:menu_items`

**SDK constant:** `Hooks.ADMIN_MENU_ITEMS` (`'admin:menu_items'`).

**Type:** Apply-filters hook — use `addFilter` / `applyFilters`. Each handler receives the current menu items array and returns a (possibly modified) array.

**Payload:**

```typescript
{
  menuItems: AdminMenuItem[];
  siteId: string;
}
```

### `public:footer_sections`

**SDK constant:** `Hooks.PUBLIC_FOOTER_SECTIONS` (`'public:footer_sections'`).

**Type:** Apply-filters hook. Each handler receives footer section definitions and can modify them.

---

## Plugin-Specific Hooks

### `ical.sync_requested`

**String:** `'ical.sync_requested'` (defined as `ICAL_SYNC_HOOK` in `plugins/ical/src/index.ts`).

**Fired by:** ical-import plugin (when `OTAAdapter.fetchReservations` is called).

**Listeners:** ical, ical-import

**Payload:**

```typescript
{
  since?: string;  // ISO 8601 — only sync events since this date
}
```

### `ical:events_fetched`

**String:** `'ical:events_fetched'` (published via `api.publish`).

**Fired by:** ical plugin (after fetching external calendars).

**Payload:**

```typescript
{
  propertyId: string;
  count: number;
}
```

### `dashboard.get_stats`

**String:** `'dashboard.get_stats'`.

**Fired by:** Core system (when dashboard stats are requested).

**Listeners:** listing-admin

**Payload:**

```typescript
{
  siteId: string;
  period: 'today' | 'week' | 'month' | 'year';
}
```

### `LISTING_CREATED` / `LISTING_UPDATED` / `PROPERTY_REGISTERED`

**Strings:** `'LISTING_CREATED'`, `'LISTING_UPDATED'`, `'PROPERTY_REGISTERED'`.

**Fired by:** `plugins/resource/src/routes/index.ts`.

**Listeners:** resource plugin itself.

---

## Core System Hooks (Framework Internal)

These are fired by the core framework (not plugins) and are typically used via `doAction` / `applyFilters`:

| Hook String | Constant | When | Payload |
|---|---|---|---|
| `core:request:bootstrap` | `Hooks.CORE_REQUEST_BOOTSTRAP` | Every request after site resolution | `{ siteId, plan }` |
| `core:site:resolved` | `Hooks.CORE_SITE_RESOLVED` | After site row loaded | `{ siteId, slug, plan }` |
| `core:post:before_save` | `Hooks.CORE_POST_BEFORE_SAVE` | Before a post is saved (filter) | post input object |
| `core:post:after_save` | `Hooks.CORE_POST_AFTER_SAVE` | After a post is saved | saved post object |
| `core:post:before_delete` | `Hooks.CORE_POST_BEFORE_DELETE` | Before a post is deleted | `{ id, siteId }` |
| `core:option:get` | `Hooks.CORE_OPTION_GET` | When an option is read (filter) | option value |
| `core:option:set` | `Hooks.CORE_OPTION_SET` | When an option is written | `{ siteId, name, value }` |
| `core:theme:loaded` | `Hooks.CORE_THEME_LOADED` | After a theme is loaded | `{ siteId, themeId }` |
| `core:plugin:submitted` | `Hooks.CORE_PLUGIN_SUBMITTED` | Developer submits a plugin | submission object |
| `core:plugin:activated` | `Hooks.CORE_PLUGIN_ACTIVATED` | Plugin activated for a site | `{ siteId, pluginId, version }` |
| `core:plugin:deactivated` | `Hooks.CORE_PLUGIN_DEACTIVATED` | Plugin deactivated | `{ siteId, pluginId }` |
| `core:manifest:build` | `Hooks.CORE_MANIFEST_BUILD` | PWA manifest built (filter) | manifest object |
| `core:site:plan_upgraded` | `Hooks.CORE_SITE_PLAN_UPGRADED` | Site plan upgraded | `{ siteId, previousPlan, newPlan }` |

---

## Hook Priority Guidelines

| Priority | Use case |
|---|---|
| 1–5 | Security / validation (reject invalid data early) |
| 6–10 | Data enrichment (add fields) |
| 11–50 | Business logic (modify pricing, apply rules) |
| 51–100 | Side effects (notifications, external API calls) |

Set priority as the third argument:

```typescript
api.registerHook('BOOKING_CREATED', handler, 51); // side effect — runs late
```

---

## Constants Reference

```typescript
import { Hooks } from '@sinaicamps/plugin-sdk';

// Hooks object contains:
Hooks.PRICING_CALCULATE       // 'pricing:calculate'
Hooks.FOLIO_PRE_ADD_CHARGE    // 'folio:pre_add_charge'
Hooks.PAYMENT_ON_SUCCESS      // 'payment:success'
Hooks.PAYMENT_COLLECT_METHODS // 'payment:collect_methods'
Hooks.RESERVATION_AFTER_CREATE // 'reservation:after_create'
Hooks.RESERVATION_AFTER_CANCEL // 'reservation:after_cancel'
Hooks.POS_ORDER_COMPLETED     // 'pos:order_completed'
Hooks.GUEST_CHECKED_OUT       // 'CHECKOUT_COMPLETED'
Hooks.GUEST_REVIEWED          // 'guest:reviewed'
Hooks.NOTIFICATION_SEND       // 'notification:send'
Hooks.ADMIN_MENU_ITEMS        // 'admin:menu_items'
Hooks.PUBLIC_FOOTER_SECTIONS  // 'public:footer_sections'
```

Booking plugin–specific hooks (no SDK constant): `'BOOKING_CREATED'`, `'CHECKIN_COMPLETED'`, `'BOOKING_CANCELLED'`, `'ical.sync_requested'`.
