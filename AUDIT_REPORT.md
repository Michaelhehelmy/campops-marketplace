# CampOps Marketplace — Core Genericization Audit Report

**Date:** May 2026  
**Scope:** `src/` (excluding `plugins/`), `packages/plugin-sdk/`  
**Goal:** Identify every domain-specific coupling so the core can become a reusable, vertical-agnostic framework.

---

## 1. Executive Summary

| Category                        | Count | Disposition                            |
| ------------------------------- | ----- | -------------------------------------- |
| Domain tables in core schema    | 6     | Move/rename                            |
| Domain seed data rows           | ~25   | Move to plugin init or test fixtures   |
| Domain-specific API routes      | 9     | Move to plugins or remove              |
| Domain repos in PluginAPI / SDK | 5     | Remove from SDK surface                |
| Domain hook constants           | 4     | Genericise                             |
| Domain paths in middleware      | 3     | Remove                                 |
| Core infrastructure (keep)      | —     | Auth, plugin registry, tenant, routing |

Baseline test state before refactoring: **12 test files failing, 25 tests failing** (350 total).

---

## 2. Database Schema (`src/db/schema.ts`)

### 2a. MUST MOVE TO PLUGINS

| Table                 | Domain             | Target Plugin                              |
| --------------------- | ------------------ | ------------------------------------------ |
| `marketplaceBookings` | Booking commerce   | `financial-ops` plugin or `booking` plugin |
| `commissionRates`     | Commission/finance | `financial-ops` plugin                     |
| `reservations`        | Booking flow       | `booking` plugin                           |
| `roomTypes`           | Room inventory     | `booking` plugin                           |

### 2b. RENAME / GENERICISE (keep in core, rename concept)

| Current Name      | New Name        | Reason                                                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| `properties`      | `tenants`       | "Property" is hospitality-domain. Core concept = a _tenant_ (a registered entity on the platform) |
| `propertyStaff`   | `tenantStaff`   | Same domain coupling                                                                              |
| `propertyPlugins` | `tenantPlugins` | "Property plugin" is domain-specific; concept = plugin assignment to a tenant                     |

### 2c. KEEP AS-IS (truly generic)

| Table              | Reason                                                 |
| ------------------ | ------------------------------------------------------ |
| `users`            | Auth infrastructure                                    |
| `sessions`         | Auth infrastructure                                    |
| `accounts`         | Auth infrastructure                                    |
| `verifications`    | Auth infrastructure                                    |
| `userRoles`        | Generic RBAC                                           |
| `availablePlugins` | Plugin registry                                        |
| `profiles`         | Generic user profile                                   |
| `categories`       | Generic resource taxonomy (used by marketplace plugin) |

**Disposition:** Tables `marketplaceBookings`, `commissionRates`, `reservations`, `roomTypes` are removed from core schema and must be owned by their respective plugins via `api.db.createTable()`. Tables `properties`/`propertyStaff`/`propertyPlugins` are renamed to `tenants`/`tenantStaff`/`tenantPlugins` to remove hospitality semantics from core.

---

## 3. Core Database Wrapper (`src/lib/db.ts`)

### 3a. Domain coupling in `resetMockStore()`

The `resetMockStore()` method (used by tests) hardcodes:

- `CREATE TABLE ... rooms` — booking domain
- `CREATE TABLE ... room_types` — booking domain
- `CREATE TABLE ... reservations` — booking domain
- `CREATE TABLE ... marketplace_bookings` — financial domain
- `CREATE TABLE ... commission_rates` — financial domain
- `CREATE TABLE ... commission_transactions` — financial domain
- `CREATE TABLE ... stripe_connect_accounts` — payment domain
- `CREATE TABLE ... payout_summaries` — payment domain
- `CREATE TABLE ... properties` — renamed → `tenants`
- `CREATE TABLE ... property_staff` — renamed → `tenant_staff`
- `CREATE TABLE ... property_plugins` — renamed → `tenant_plugins`
- Seed rows for `Safari Camp`, `Mountain Lodge` (hard-coded camp names)
- Seed rows for `room_types` (Luxury Tent, Family Lodge, Alpine Suite)
- Seed rows for `reservations`, `marketplace_bookings`, `commission_rates`

**Disposition:**

- Domain tables (`rooms`, `room_types`, `reservations`, `marketplace_bookings`, `commission_rates`, `commission_transactions`, `stripe_connect_accounts`, `payout_summaries`) removed from core `resetMockStore()`.
- Core tables renamed (`properties→tenants`, `property_staff→tenant_staff`, `property_plugins→tenant_plugins`).
- Domain seed data (room types, reservations, bookings, commission rates) **stays** in `resetMockStore()` for test backward-compatibility — the tests that rely on this data test the _marketplace application_, not the core. They must still pass.
- Column mapping in `_normalizeRow()` updated to cover renamed tables.

### 3b. Domain column aliases in `_normalizeRow()`

`keyMapping` contains `property_id → propertyId`, `check_in → checkIn`, etc. These are low-level SQLite column aliases needed by tests; they are kept but the _concept_ of "property" at the framework layer is replaced by "tenant".

---

## 4. Plugin API Factory (`src/lib/PluginAPI.ts`)

### 4a. Domain-specific pre-built repositories

```typescript
const dbApi: PluginDatabaseAPI = {
  rooms: makeScopedRepository('rooms', propertyId),         // ← booking domain
  reservations: makeScopedRepository('reservations', propertyId), // ← booking domain
  guests: makeScopedRepository('guests', propertyId),       // ← CRM domain
  folios: makeScopedRepository('folios', propertyId),       // ← POS domain
  roomTypes: makeScopedRepository('room_types', propertyId),// ← booking domain
  ...
};
```

These shortcut repositories expose hospitality-domain concepts to every plugin through the SDK, which is wrong. The `PluginDatabaseAPI` in `packages/plugin-sdk/src/types.ts` mirrors this.

**Disposition:** Remove `rooms`, `reservations`, `guests`, `folios`, `roomTypes` pre-built repos from both `PluginAPI.ts` and `packages/plugin-sdk/src/types.ts`. Plugins that need these tables use `api.db.query()` / `api.db.createTable()` directly with their own prefixed table names.

**Impact on tests:** `PluginAPI.test.ts` tests for `db.rooms`, `db.reservations`, `db.guests`, `db.folios`, `db.roomTypes` — these tests are domain-specific and must be relocated/rewritten to test generic DB capabilities.

---

## 5. Hook Constants (`src/lib/hooks.ts`)

```typescript
export const Hooks = {
  PAYMENT_ON_SUCCESS: 'payment:success',
  PRICING_CALCULATE: 'pricing:calculate',
  GUEST_CHECKED_OUT: 'guest:checked_out', // ← "guest" concept
  NOTIFICATION_SEND: 'notification:send',
  LISTING_PAGE_LOAD: 'listing:page_load', // ← "listing" concept
  BOOKING_CREATED: 'booking:created', // ← booking domain
};
```

`GUEST_CHECKED_OUT`, `LISTING_PAGE_LOAD`, `BOOKING_CREATED` are domain-specific.

**Disposition:** Replace with generic equivalents:

- `GUEST_CHECKED_OUT` → `ENTITY_DEPARTED` (or removed; plugins define their own hook strings)
- `LISTING_PAGE_LOAD` → `RESOURCE_PAGE_LOAD`
- `BOOKING_CREATED` → `TRANSACTION_CREATED`
- Keep `PAYMENT_ON_SUCCESS`, `PRICING_CALCULATE`, `NOTIFICATION_SEND` (generic)

---

## 6. Core API Routes (`src/app/api/`)

### 6a. MUST MOVE TO PLUGINS

| Route                                   | Domain                | Target                                                  |
| --------------------------------------- | --------------------- | ------------------------------------------------------- |
| `POST /api/public/book`                 | Booking creation      | `booking` plugin (`/api/p/booking/book` already exists) |
| `GET /api/public/search`                | Property search       | `resource-manager` plugin / marketplace plugin          |
| `GET /api/public/featured-listings`     | Listing display       | `resource-manager` plugin                               |
| `GET /api/manage/[listingId]/bookings`  | Booking CRUD          | `booking` plugin                                        |
| `POST /api/manage/[listingId]/bookings` | Booking creation      | `booking` plugin                                        |
| `GET /api/guest/reservations`           | Guest booking data    | `booking` plugin                                        |
| `GET /api/guest/dashboard`              | Guest dashboard stats | Aggregated by booking plugin                            |

**Strategy:** Keep the route files but have them proxy/redirect to the plugin-registered route, ensuring tests don't break. Long-term, these should be deleted once the booking plugin's routes (`/api/p/booking/*`) stabilise.

### 6b. GENERICISE (rename concept, keep logic)

| Route                               | Change                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/master/listings`          | Rename concept to "tenants"; route stays, it's just listing registered tenants |
| `GET /api/master/stats`             | Remove reference to `marketplace_bookings`; stats are now plugin-aggregated    |
| `GET /api/manage/[listingId]/stats` | Remove booking-specific stats; provide generic tenant stats                    |

### 6c. KEEP AS-IS (truly generic)

| Route                             | Reason                                     |
| --------------------------------- | ------------------------------------------ |
| `/api/auth/*`                     | Auth infrastructure                        |
| `/api/plugins/*`                  | Plugin management                          |
| `/api/plugins/ui-registry`        | Generic slot aggregation                   |
| `/api/manage/[listingId]/plugins` | Generic plugin enable/disable for a tenant |
| `/api/tenant/resolve`             | Generic tenant resolution                  |
| `/api/[...path]`                  | Catch-all for plugin-registered routes     |
| `/api/admin/*`                    | Admin infrastructure                       |
| `/api/branding/*`                 | Tenant branding                            |
| `/api/menus/*`                    | Generic navigation registry                |

---

## 7. Middleware (`src/middleware.ts`)

Domain-specific paths:

- `/list-your-camp` — "camp" branding
- `/stay` — hospitality slug rewrite
- `/book` — booking path

**Disposition:**

- `/list-your-camp` → rename to `/list-your-space` (generic) or remove from reserved list
- `/stay` rewrite logic → rename to `/resource` or make the rewrite target generic
- `/book` → keep (it's a plugin page, not core logic)

---

## 8. Pages & Components (`src/app/[locale]/`)

| Path                                   | Domain Logic                  | Disposition                                                |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `stay/[slug]/page.tsx`                 | Full booking form, room types | Move booking form into `PluginShell` slot; keep page shell |
| `guest/page.tsx`                       | Reservations list, trip cards | Move to booking plugin slot; keep page shell               |
| `manage/[listingId]/bookings/page.tsx` | Manager booking CRUD          | Move to booking plugin slot                                |
| `manage/[listingId]/rooms/page.tsx`    | Room management               | Move to booking plugin slot                                |
| `search/page.tsx`                      | Property search               | Move to resource-manager plugin slot                       |
| `list-your-camp/page.tsx`              | Camp registration form        | Move to marketplace plugin; rename path                    |

**Disposition:** All pages become thin shells that render `<PluginShell name="..." />` for domain content. Core provides auth, layout, navigation — no business logic.

---

## 9. Plugin SDK (`packages/plugin-sdk/src/types.ts`)

`PluginDatabaseAPI` interface has domain-specific fields:

```typescript
rooms: ScopedRepository<...>        // booking domain
reservations: ScopedRepository<...> // booking domain
guests: ScopedRepository<...>       // CRM domain
folios: ScopedRepository<...>       // POS domain
roomTypes: ScopedRepository<...>    // booking domain
```

**Disposition:** Remove these fields. The SDK surface exposes only generic methods: `query`, `queryOne`, `execute`, `createTable`, `dropTable`, `tableExists`. Plugins manage their own table structure.

---

## 10. Summary: What "Keep", "Move", "Remove", "Rename"

### KEEP (no changes needed)

- `src/lib/PluginRouteRegistry.ts` — generic
- `src/lib/PluginDiscoveryService.ts` — generic
- `src/lib/PluginRuntimeService.ts` — generic
- `src/lib/SlotManager.tsx` — generic
- `src/lib/auth.ts` / `auth-client.ts` — generic
- `src/lib/plugins-init.ts` / `plugins-frontend-init.ts` — generic
- `src/app/PluginShell.tsx` — generic
- `src/app/api/auth/*` — generic
- `src/app/api/plugins/*` — generic
- `src/app/api/tenant/*` — generic
- `src/app/api/admin/*` — generic

### RENAME (same logic, generic name)

- `properties` table → `tenants`
- `property_staff` table → `tenant_staff`
- `property_plugins` table → `tenant_plugins`
- Hook `GUEST_CHECKED_OUT` → `ENTITY_DEPARTED`
- Hook `LISTING_PAGE_LOAD` → `RESOURCE_PAGE_LOAD`
- Hook `BOOKING_CREATED` → `TRANSACTION_CREATED`
- Middleware path `/list-your-camp` → `/list-your-space`

### MOVE TO PLUGIN (logic correct, wrong owner)

- Core tables: `marketplace_bookings`, `commissionRates`, `reservations`, `roomTypes`
- Core seed data: room types, reservations, bookings, commission rates
- API routes: `/api/public/book`, `/api/manage/[id]/bookings`, `/api/guest/reservations`
- SDK pre-built repos: `rooms`, `reservations`, `guests`, `folios`, `roomTypes`

### REMOVE (no longer needed in core)

- `src/db/schema.ts` domain tables (after confirming plugins own them)
- `PluginDatabaseAPI` domain-specific shortcut repositories

---

## 11. Test Impact

| Test File                    | Current                                         | After Refactoring                                                                    |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `db.test.ts`                 | Generic DB ops                                  | Unchanged (uses `test_table`)                                                        |
| `db-coverage.test.ts`        | Generic DB ops                                  | Unchanged                                                                            |
| `PluginAPI.test.ts`          | Tests `db.rooms`, `db.reservations` etc.        | Remove domain-repo tests; add `getTable()` generic test                              |
| `plugin-ecosystem.test.ts`   | Tests `properties`, `property_plugins` tables   | Updated to use `tenants`, `tenant_plugins`                                           |
| `admin.test.ts`              | Uses `properties` table directly                | Updated to use `tenants`                                                             |
| `payments.test.ts`           | Uses `marketplace_bookings`, `commission_rates` | Stays (payments are a plugin concern; test is valid as marketplace integration test) |
| `plugin-integration.test.ts` | Integration between booking+crm plugins         | Stays in plugin test suite                                                           |
| `ui-registry.test.ts`        | Tests `property_plugins` join                   | Updated to use `tenant_plugins`                                                      |
| `manage/bookings/__tests__`  | Booking CRUD                                    | Stays (tests booking plugin route surface)                                           |
| `master/listings/__tests__`  | Lists tenants                                   | Updated to use `tenants` concept                                                     |

---

_End of Audit Report_

---

## Phase 1 (Legacy): Plugin Inventory

### Existing Plugins (22 total)

| Plugin                   | Purpose                                              | Slots Registered                                         | API Routes                                           | Hooks                      | SDK Methods                        | Status                                      |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | -------------------------- | ---------------------------------- | ------------------------------------------- |
| **booking**              | Standardized booking flow and management             | `listing.sidebar`, `admin.settings.tabs`                 | `/api/bookings` (registered via `api.registerRoute`) | Emits: `BOOKING_CREATED`   | `createBooking()`, `getBookings()` | Partially implemented (stub UI, basic hook) |
| **crm**                  | Guest relationship management and activity logging   | `guest.dashboard.bottom`, `admin.settings.tabs`          | None (uses DB directly)                              | Listens: `BOOKING_CREATED` | `getActivities()`                  | Partially implemented (basic hook listener) |
| **pwa**                  | Offline support and mobile install prompts           | `listing.header`, `dashboard.top`, `admin.settings.tabs` | None                                                 | None                       | None                               | Partially implemented (UI only)             |
| **staff-roster**         | Staff roster & shifts                                | None                                                     | None                                                 | None                       | None                               | Stub (minimal plugin.json)                  |
| **maintenance**          | Asset maintenance, work orders                       | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **housekeeping**         | Housekeeping & maintenance                           | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **loyalty**              | Guest loyalty program (Beats points)                 | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **accounting**           | Enterprise accounting (ledger, invoicing)            | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **activities**           | Activities & Guest Experiences                       | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **financial-ops**        | Financial Operations                                 | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **guest-crm**            | Guest CRM & Marketing                                | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **hr-core**              | HR Core & Payroll                                    | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **ical**                 | iCal Sync for room availability                      | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **ical-import**          | iCal Import Adapter for OTA Sync Queue               | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **inventory-waste**      | Inventory & Waste Management                         | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **listing-admin**        | Property-level dashboard for marketplace stats       | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **marketing-automation** | Marketing Automation (email campaigns, segmentation) | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **ota-channel-manager**  | OTA & Channel Management                             | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **pos-kds**              | POS & Order Management                               | None                                                     | None                                                 | None                       | None                               | Stub                                        |
| **siteminder**           | SiteMinder Channel Manager sync                      | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **subscriptions**        | Memberships & Seasonal billing                       | `dashboard.widgets`                                      | None                                                 | None                       | None                               | Partially implemented (widget only)         |
| **test-dock**            | Test plugin for Plugin Dock                          | `admin.pos_widget`                                       | `/api/test-dock/dummy`, `/api/test-dock/ping`        | None                       | None                               | Partially implemented (test plugin)         |

### Key Findings:

1. **Most plugins are stubs** - Only booking, crm, and pwa have meaningful implementation
2. **Inconsistent plugin structure** - Some have UI entries, some don't; some use `api.registerRoute`, most don't
3. **No standard pattern** - Each plugin follows its own structure
4. **Minimal hook usage** - Only CRM plugin listens to `BOOKING_CREATED` hook

---

## Phase 1: Hardcoded Business Logic in Main App

### 1. Booking Flow (HIGH PRIORITY)

**Location**: `/home/michael/Proj/campops-marketplace/src/app/[locale]/stay/[slug]/page.tsx`

**Hardcoded Logic**:

- `handleReserve()` - Sets booking confirmed state
- `handleConfirmBooking()` - Makes POST request to `/api/public/book` with booking data
- Booking form UI with guest name, email inputs
- Booking step state management (`idle` → `details` → `confirmed`)
- Room type display and "Book Now" links
- Direct API integration bypassing Booking plugin

**Should Be In**: Booking plugin (public booking slot)

**Impact**: Fails tests 1, 4, 6 (integration, marketplace-public-full, public)

---

### 2. Guest Dashboard (HIGH PRIORITY)

**Location**: `/home/michael/Proj/campops-marketplace/src/app/[locale]/guest/page.tsx`

**Hardcoded Logic**:

- Direct API call to `/api/guest/reservations` to fetch guest bookings
- `TripCard` component for displaying reservation details
- Dashboard stats (total trips, activity count)
- "Contextual Perks" section (hardcoded for "Safari Luxury Camp")
- Navigation tabs hardcoded (Trips, Orders, Following)

**Should Be In**: Guest Dashboard plugin or Booking plugin (guest dashboard slot)

**Impact**: Fails test 2 (marketplace-guest-full)

---

### 3. Manager Bookings Page (HIGH PRIORITY)

**Location**: `/home/michael/Proj/campops-marketplace/src/app/[locale]/manage/[listingId]/bookings/page.tsx`

**Hardcoded Logic**:

- Direct API calls to `/api/manage/[listingId]/bookings` (GET, POST, PATCH)
- Booking table UI with guest info, dates, status
- Check-in/Check-out buttons with `handleCheckIn()` function
- Modal for adding/editing bookings
- Notes field management

**Should Be In**: Booking plugin (manager bookings slot)

**Impact**: Fails tests 1, 3 (integration, marketplace-manager-full)

---

### 4. Backend API Routes (HIGH PRIORITY)

**Booking API Routes** (should be in Booking plugin):

- `/api/public/book/route.ts` - Creates bookings for public users
- `/api/manage/[listingId]/bookings/route.ts` - Manager booking CRUD operations
- `/api/guest/reservations/route.ts` - Guest reservation retrieval

**These routes**:

- Use Drizzle ORM directly (not through plugin SDK)
- Have hardcoded business logic for booking validation
- Emit hooks but are not plugin-owned
- Should be registered via plugin's `api.registerRoute()`

---

### 5. Search & Filters (MEDIUM PRIORITY)

**Location**: `/home/michael/Proj/campops-marketplace/src/app/[locale]/search/page.tsx`

**Hardcoded Logic**:

- Search form with location, dates, guests inputs
- Direct API calls to search endpoints
- Filter UI (price range, amenities, etc.)

**Should Be In**: Search plugin (if it exists) or core marketplace (if core infrastructure)

**Impact**: Fails test 5 (marketplace-public search/filters)

---

### 6. Manager Property Management (MEDIUM PRIORITY)

**Locations**:

- `/home/michael/Proj/campops-marketplace/src/app/[locale]/manage/[listingId]/rooms/page.tsx` (if exists)
- `/home/michael/Proj/campops-marketplace/src/app/[locale]/manage/[listingId]/guests/page.tsx` (if exists)
- `/home/michael/Proj/campops-marketplace/src/app/[locale]/manage/[listingId]/plugins/page.tsx` (if exists)

**Hardcoded Logic**:

- Room management UI
- Guest list UI
- Plugin enable/disable UI

**Should Be In**: Separate plugins (Rooms plugin, Guests plugin) or existing plugins

**Impact**: Fails test 3 (marketplace-manager-full)

---

## Phase 1: App Logic That Could Be Extracted (with Justification)

### 1. Search & Filter Logic

**Current Location**: Main app search page
**Decision**: **KEEP IN CORE** (or create Search plugin)
**Justification**: Search is core marketplace infrastructure. All properties need it regardless of plugins. Could be extracted to a Search plugin if search becomes complex (multi-property, advanced filters).

### 2. Property Listing Display

**Current Location**: Main app listing pages
**Decision**: **KEEP IN CORE**
**Justification**: Property listings are the core product. Plugins can extend via slots (listing.header, listing.sidebar) but the base listing display should remain in core.

### 3. Authentication & Authorization

**Current Location**: Main app (NextAuth.js, middleware)
**Decision**: **KEEP IN CORE**
**Justification**: Auth is cross-cutting infrastructure that all plugins depend on. Should not be plugin-specific.

### 4. Plugin Registry & Shell

**Current Location**: Main app (PluginShell, PluginRegistryProvider)
**Decision**: **KEEP IN CORE**
**Justification**: This is the plugin infrastructure itself. Must be in core to enable plugins.

### 5. Database Schema (Core Tables)

**Current Location**: Main app (src/db/schema.ts)
**Decision**: **KEEP IN CORE** for user/session tables, **MOVE TO PLUGINS** for business tables
**Justification**:

- Core tables (users, sessions, accounts, properties) belong in core
- Business tables (bookings, reservations, activities, etc.) should be owned by respective plugins

---

## Phase 1: Standard Plugin Template

Based on the audit, here is the recommended standard for implementing plugins:

### File Structure

```
plugins/<plugin-name>/
├── plugin.json              # Plugin metadata
├── package.json             # NPM dependencies
├── tsconfig.json            # TypeScript config
├── README.md                # Plugin documentation
├── src/
│   ├── index.ts             # Plugin entry point (init function, hooks, API registration)
│   ├── ui.tsx               # React components exported for slots
│   ├── api/                 # Plugin API routes (if any)
│   │   └── route.ts        # API route handlers with Zod validation
│   ├── db/                  # Database schema and migrations
│   │   ├── schema.ts       # Drizzle schema for plugin tables
│   │   └── migrations/     # Migration files
│   ├── hooks.ts             # Tapable hook definitions
│   ├── services.ts          # Business logic services
│   └── types.ts             # TypeScript types
├── __tests__/               # Plugin tests
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
└── migrations/              # SQL migration files (if using raw SQL)
```

### plugin.json Template

```json
{
  "id": "<plugin-id>",
  "name": "<Plugin Display Name>",
  "version": "1.0.0",
  "description": "<Brief description of plugin purpose>",
  "author": "CampOps Core",
  "category": "<category>",
  "apiVersion": "^2.0.0",
  "entry": "src/index.ts",
  "uiEntry": "src/ui.tsx",
  "slots": {
    "<slot-name>": ["<plugin-id>:<ComponentName>"]
  },
  "menuItems": [
    {
      "id": "<menu-item-id>",
      "label": "<Menu Label>",
      "path": "<path>",
      "order": <number>
    }
  ],
  "permissions": ["<permission1>", "<permission2>"]
}
```

### src/index.ts Template

```typescript
import type { PluginAPI } from '@campops/plugin-sdk';
import { z } from 'zod';

/**
 * <Plugin Name> Plugin
 * ─────────────────────
 * <Description of plugin purpose>
 */
export default async function init(api: PluginAPI) {
  api.logger.info('Initializing <Plugin Name> Plugin...');

  // 1. Create database tables (using Drizzle or raw SQL)
  await api.db.createTable(
    '<table_name>',
    `
    <table_schema_sql>
  `
  );

  // 2. Register UI components for slots
  api.ui.addSlotComponent('<slot-name>', '<plugin-id>:<ComponentName>');

  // 3. Register API routes with Zod validation
  api.registerRoute('/api/<plugin-route>', async (req: Request) => {
    // Zod validation schema
    const schema = z.object({
      field1: z.string(),
      field2: z.number(),
    });

    const body = await req.json();
    const validated = schema.parse(body);

    // Business logic
    const result = await processRequest(validated);

    return new Response(JSON.stringify(result), { status: 200 });
  });

  // 4. Register Tapable hooks (emit events)
  // api.executeHook('EVENT_NAME', { data });

  // 5. Listen to hooks from other plugins
  api.registerHook('EVENT_NAME', async (data: any) => {
    // Handle event
    return data;
  });

  // 6. Return public API for other plugins
  return {
    async method1() {
      // Service logic
    },
    async method2() {
      // Service logic
    },
  };
}
```

### src/ui.tsx Template

```typescript
import React from 'react';

/**
 * <ComponentName>
 * ─────────────────
 * <Description of component purpose>
 */
export function <ComponentName>({ props }: { props: any }) {
  return (
    <div data-testid="<component-test-id>">
      {/* Component UI */}
    </div>
  );
}

/**
 * Register components with the registry
 */
export function registerPlugin(registry: any) {
  registry.register('<plugin-id>:<ComponentName>', <ComponentName>);
}
```

### src/api/route.ts Template (if using Next.js route handlers)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod validation schema
const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    // Business logic
    const result = await processRequest(validated);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### src/hooks.ts Template

```typescript
import { Tapable } from 'tapable';

export const hooks = {
  // Define hooks this plugin emits
  <EVENT_NAME>: new Tapable.SyncWaterfallHook(['data']),

  // Define hooks this plugin listens to
  // (listening is done in index.ts via api.registerHook)
};
```

### README.md Template

```markdown
# <Plugin Name>

## Purpose

<Brief description of what this plugin does>

## Features

- Feature 1
- Feature 2
- Feature 3

## Slots

- `<slot-name>`: `<ComponentName>` - Description

## API Routes

- `GET /api/<route>` - Description
- `POST /api/<route>` - Description

## Hooks

- Emits: `<EVENT_NAME>` - Description
- Listens to: `<EVENT_NAME>` - Description

## Dependencies

- @campops/plugin-sdk
- zod
- drizzle-orm

## Installation

1. Add to plugin manifest in database
2. Restart application
3. Configure settings in admin panel

## Testing

Run tests: `npm test -- <plugin-name>`
```
