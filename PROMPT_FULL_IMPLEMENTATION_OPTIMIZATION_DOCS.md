# OpenCode Multi-Agent Prompt: Full Plugin Implementation + Performance + Documentation

## Executive Summary

**Three Major Phases**:
1. **Plugin Implementation** — Fully implement all 24 existing plugins with complete features
2. **Performance Optimization** — Caching, bundle size, database queries, API response times
3. **Comprehensive Documentation** — User guides, API docs, architecture docs for everything

**Current State**: Plugins exist but many have placeholder data, stub implementations, or incomplete features
**Target State**: Production-ready, fully-featured plugins with optimized performance and complete documentation

---

## Phase 1: Full Plugin Implementation (Priority: CRITICAL)

### 1.1 Plugin Inventory & Status

| Plugin | Status | Missing Features | Priority |
|--------|--------|------------------|----------|
| **booking** | 🟡 Partial | Complete booking flow, payment integration, calendar sync | HIGH |
| **housekeeping** | 🟡 Partial | Real data (not hardcoded), room integration, notifications | HIGH |
| **maintenance** | 🟡 Partial | Real data (not hardcoded), work order flow, asset management | HIGH |
| **pos-kds** | 🟡 Partial | KDS display, inventory sync, reporting | HIGH |
| **inventory-waste** | 🟡 Partial | Stock tracking, waste analytics, reorder alerts | MEDIUM |
| **staff-roster** | 🟡 Partial | Shift scheduling, time tracking, payroll integration | MEDIUM |
| **loyalty** | 🟢 Good | Points system working, needs redemption UI | MEDIUM |
| **crm** | 🟡 Partial | Guest history, activity tracking, segmentation | MEDIUM |
| **guest-crm** | 🟡 Partial | Marketing automation, email campaigns | MEDIUM |
| **ota-channel-manager** | 🔴 Stub | iCal sync, rate parity, channel mapping | HIGH |
| **ical** | 🔴 Stub | Calendar import/export, sync engine | HIGH |
| **ical-import** | 🔴 Stub | Import parsing, conflict resolution | HIGH |
| **integrations** | 🔴 Empty | External APIs, webhooks, zapier | MEDIUM |
| **siteminder** | 🔴 Stub | Channel manager integration | MEDIUM |
| **marketing-automation** | 🔴 Stub | Campaign builder, triggers, templates | MEDIUM |
| **financial-ops** | 🔴 Stub | Reporting, analytics, exports | MEDIUM |
| **accounting** | 🔴 Stub | Ledger, invoicing, tax reports | MEDIUM |
| **hr-core** | 🔴 Stub | Employee records, leave management | LOW |
| **activities** | 🔴 Stub | Activity booking, scheduling | MEDIUM |
| **subscriptions** | 🔴 Stub | Recurring billing, plan management | MEDIUM |
| **resource** | 🟢 Good | Core resource management working | GOOD |
| **pwa** | 🟢 Good | PWA features working, needs tenant customization | MEDIUM |
| **paymob** | 🟡 Partial | Payment gateway integration | HIGH |
| **listing-admin** | 🟡 Partial | Listing management features | MEDIUM |
| **owner** | 🟢 Good | Owner dashboard working | GOOD |

### 1.2 Critical Plugin Implementations

#### A. Booking Plugin — Complete Feature Set

**Current State**: Basic availability check and booking creation
**Required Features**:

**API Routes** (`plugins/booking/src/api/routes.ts`):
```typescript
// Add missing routes:
- GET /api/p/booking/calendar/:listingId — Calendar view with availability
- GET /api/p/booking/stats/:listingId — Booking statistics
- PATCH /api/p/booking/:id/cancel — Cancel with refund logic
- POST /api/p/booking/:id/extend — Extend stay
- POST /api/p/booking/:id/addons — Add extras (breakfast, airport pickup)
- GET /api/p/booking/invoices/:bookingId — Generate invoice
- POST /api/p/booking/waitlist — Add to waitlist when no availability
- GET /api/p/booking/occupancy/:listingId — Occupancy report
```

**Services** (`plugins/booking/src/services/`):
```typescript
// Create new services:
- CancellationService.ts — Handle refunds, policy checks
- AddOnService.ts — Manage extras and upsells
- InvoiceService.ts — Generate PDF invoices
- WaitlistService.ts — Manage waitlist queue
- CalendarSyncService.ts — Sync with external calendars
```

**UI Components** (`plugins/booking/src/ui.tsx`):
```typescript
// Add components:
- CalendarView — Full calendar with availability
- BookingDetailsModal — Complete booking view
- CancellationModal — Policy display + refund calculation
- AddOnSelector — Breakfast, transfers, extras
- InvoiceViewer — PDF generation preview
- OccupancyChart — Visual occupancy report
```

**Database Tables**:
```sql
-- Add to existing schema:
CREATE TABLE plugin_booking_addons (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  addon_type TEXT NOT NULL, -- 'breakfast', 'transfer', 'activity'
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at INTEGER NOT NULL
);

CREATE TABLE plugin_booking_waitlist (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'notified', 'converted', 'expired'
  created_at INTEGER NOT NULL,
  notified_at INTEGER
);

CREATE TABLE plugin_booking_invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'void'
  due_date TEXT,
  pdf_url TEXT,
  created_at INTEGER NOT NULL
);
```

**Agent Assignment**: @plugin_booking + @backend_architect

---

#### B. Housekeeping Plugin — Full Operations

**Current State**: Static task list (hardcoded in `maintenanceRouter`)
**Required Features**:

**Database Schema** (`plugins/housekeeping/src/index.ts`):
```typescript
// Replace current simple table with full schema:
await api.db.query(`
  CREATE TABLE IF NOT EXISTS plugin_housekeeping_tasks (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_number TEXT,
    task_type TEXT NOT NULL, -- 'cleaning', 'inspection', 'maintenance', 'restock'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'verified'
    assigned_to TEXT, -- user_id
    notes TEXT,
    checklist_items TEXT, -- JSON array of {item: string, completed: boolean}
    started_at INTEGER,
    completed_at INTEGER,
    verified_by TEXT, -- user_id who verified completion
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Add room status tracking
await api.db.query(`
  CREATE TABLE IF NOT EXISTS plugin_housekeeping_room_status (
    room_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'dirty', -- 'dirty', 'cleaning', 'clean', 'inspected', 'occupied'
    last_cleaned_at INTEGER,
    next_scheduled_clean INTEGER,
    assigned_housekeeper TEXT,
    current_task_id TEXT,
    updated_at INTEGER NOT NULL
  )
`);
```

**API Routes** (`plugins/housekeeping/src/routes/housekeeping.ts`):
```typescript
// Replace hardcoded routes with full CRUD:
export function housekeepingRouter(api: PluginAPI) {
  return {
    // Task Management
    GET: async (req: Request) => {
      // Support filters: status, priority, assigned_to, room_id, date_range
      const { searchParams } = new URL(req.url);
      const tasks = await getTasksWithFilters(api.db, searchParams);
      return Response.json({ tasks });
    },
    
    POST: async (req: Request) => {
      // Create task from checkout hook or manual assignment
      const body = await req.json();
      const task = await createTask(api.db, body);
      return Response.json({ task }, { status: 201 });
    },
    
    PATCH: async (req: Request) => {
      // Update status, assign, complete
      const body = await req.json();
      const task = await updateTask(api.db, body);
      
      // Emit hook for real-time updates
      await api.executeHook('HOUSEKEEPING_TASK_UPDATED', { task });
      return Response.json({ task });
    },
    
    // Room Status
    '/rooms': {
      GET: async () => {
        const rooms = await getRoomStatusOverview(api.db);
        return Response.json({ rooms });
      },
      
      PATCH: async (req: Request) => {
        const { room_id, status } = await req.json();
        await updateRoomStatus(api.db, room_id, status);
        return Response.json({ success: true });
      }
    },
    
    // Schedule & Reports
    '/schedule': {
      GET: async (req: Request) => {
        const { date } = new URL(req.url).searchParams;
        const schedule = await getDailySchedule(api.db, date);
        return Response.json({ schedule });
      }
    },
    
    '/reports/daily': {
      GET: async (req: Request) => {
        const { date } = new URL(req.url).searchParams;
        const report = await generateDailyReport(api.db, date);
        return Response.json({ report });
      }
    }
  };
}
```

**UI Components** (`plugins/housekeeping/src/ui.tsx` — create this file):
```typescript
export function HousekeepingDashboard() {
  // Real-time task board
  // Drag-and-drop assignment
  // Room status grid
  // Priority indicators
}

export function RoomStatusBoard() {
  // Visual grid of all rooms
  // Color-coded status (dirty/clean/occupied)
  // Quick actions (assign, mark clean, inspect)
}

export function TaskAssignmentPanel() {
  // List of housekeepers
  // Drag tasks to assign
  // Workload balancing view
}

export function HousekeepingReports() {
  // Daily completion rates
  // Average cleaning times
  // Quality scores
}
```

**Hooks Integration**:
```typescript
// In init()
api.hooks.register('reservations.after_checkout', async (data) => {
  // Auto-create cleaning task when guest checks out
  await createCleaningTask(api, data.room_id, 'checkout');
});

api.hooks.register('reservations.checked_in', async (data) => {
  // Mark room as occupied, skip cleaning if already clean
  await updateRoomStatus(api, data.room_id, 'occupied');
});
```

**Agent Assignment**: @plugin_operations + @backend_architect

---

#### C. OTA Channel Manager — Full Integration

**Current State**: Completely stubbed
**Required Features**:

**Core Files**:
```
plugins/ota-channel-manager/
├── src/
│   ├── index.ts                    # Plugin entry
│   ├── api/
│   │   ├── routes.ts               # API endpoints
│   │   ├── channels/
│   │   │   ├── booking-com.ts      # Booking.com API
│   │   │   ├── airbnb.ts           # Airbnb API
│   │   │   ├── expedia.ts          # Expedia API
│   │   │   └── index.ts            # Channel factory
│   │   └── sync/
│   │       ├── availability.ts     # Availability sync engine
│   │       ├── rates.ts            # Rate sync engine
│   │       └── reservations.ts     # Reservation import
│   ├── services/
│   │   ├── ChannelService.ts       # Channel management
│   │   ├── SyncService.ts          # Sync orchestration
│   │   └── MappingService.ts       # Room mapping
│   └── ui.tsx                      # Admin UI
├── migrations/
│   └── 001_initial.sql             # Database tables
└── __tests__/
    └── integration.test.ts
```

**Database Schema**:
```sql
CREATE TABLE plugin_ota_channels (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  channel_type TEXT NOT NULL, -- 'booking_com', 'airbnb', 'expedia'
  channel_name TEXT,
  api_key TEXT, -- encrypted
  api_secret TEXT, -- encrypted
  property_id_external TEXT, -- property ID on the channel
  is_active BOOLEAN DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT 1,
  last_sync_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE plugin_ota_room_mappings (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  room_type_id TEXT NOT NULL, -- internal room type
  external_room_id TEXT NOT NULL, -- channel's room ID
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (channel_id) REFERENCES plugin_ota_channels(id)
);

CREATE TABLE plugin_ota_sync_logs (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'availability', 'rates', 'reservations'
  status TEXT NOT NULL, -- 'pending', 'success', 'error'
  details TEXT, -- JSON
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT,
  FOREIGN KEY (channel_id) REFERENCES plugin_ota_channels(id)
);

CREATE TABLE plugin_ota_reservations (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  external_reservation_id TEXT NOT NULL,
  booking_id TEXT, -- linked to internal booking
  guest_name TEXT,
  guest_email TEXT,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  room_type_id TEXT,
  total_amount REAL,
  currency TEXT,
  status TEXT, -- 'confirmed', 'cancelled', 'modified'
  raw_data TEXT, -- full JSON from channel
  imported_at INTEGER,
  FOREIGN KEY (channel_id) REFERENCES plugin_ota_channels(id)
);
```

**API Implementation**:
```typescript
// plugins/ota-channel-manager/src/api/routes.ts
export function registerRoutes(api: PluginAPI) {
  // Channel Management
  api.registerRoute('/api/p/ota/channels', {
    GET: async () => {
      const channels = await getChannels(api.db);
      return Response.json({ channels });
    },
    POST: async (req) => {
      const body = await req.json();
      const channel = await createChannel(api.db, body);
      return Response.json({ channel }, { status: 201 });
    }
  });
  
  // Room Mapping
  api.registerRoute('/api/p/ota/mappings', {
    GET: async (req) => {
      const { channel_id } = new URL(req.url).searchParams;
      const mappings = await getMappings(api.db, channel_id);
      return Response.json({ mappings });
    },
    POST: async (req) => {
      const body = await req.json();
      await createMapping(api.db, body);
      return Response.json({ success: true });
    }
  });
  
  // Manual Sync Trigger
  api.registerRoute('/api/p/ota/sync', {
    POST: async (req) => {
      const { channel_id, sync_type } = await req.json();
      const result = await triggerSync(api, channel_id, sync_type);
      return Response.json({ result });
    }
  });
  
  // Sync Status
  api.registerRoute('/api/p/ota/sync-status', {
    GET: async (req) => {
      const { channel_id } = new URL(req.url).searchParams;
      const status = await getSyncStatus(api.db, channel_id);
      return Response.json({ status });
    }
  });
}
```

**Sync Engine**:
```typescript
// plugins/ota-channel-manager/src/services/SyncService.ts
export class SyncService {
  constructor(private api: PluginAPI) {}
  
  async syncAvailability(channelId: string) {
    // 1. Get channel config
    const channel = await this.getChannel(channelId);
    
    // 2. Get room mappings
    const mappings = await this.getMappings(channelId);
    
    // 3. For each mapping, get availability from internal system
    for (const mapping of mappings) {
      const availability = await this.getAvailabilityForRoom(mapping.room_type_id);
      
      // 4. Push to channel API
      const channelAdapter = getChannelAdapter(channel.channel_type);
      await channelAdapter.updateAvailability({
        propertyId: channel.property_id_external,
        roomId: mapping.external_room_id,
        availability
      });
    }
    
    // 5. Log sync
    await this.logSync(channelId, 'availability', 'success');
  }
  
  async importReservations(channelId: string) {
    // 1. Fetch new reservations from channel
    const channel = await this.getChannel(channelId);
    const adapter = getChannelAdapter(channel.channel_type);
    const reservations = await adapter.fetchReservations({
      propertyId: channel.property_id_external,
      since: channel.last_sync_at
    });
    
    // 2. For each reservation, create or update internal booking
    for (const res of reservations) {
      await this.importReservation(channelId, res);
    }
  }
}
```

**Hooks**:
```typescript
// Listen to internal booking changes
api.hooks.register('BOOKING_CREATED', async (data) => {
  await syncService.syncAvailabilityForRoom(data.roomId);
});

api.hooks.register('BOOKING_CANCELLED', async (data) => {
  await syncService.syncAvailabilityForRoom(data.roomId);
});
```

**Agent Assignment**: @plugin_integrations + @backend_architect

---

#### D. POS & KDS Plugin — Full Restaurant Operations

**Current State**: Basic items and orders
**Required Features**:

**Extended Schema** (`plugins/pos-kds/src/index.ts`):
```sql
-- Existing tables:
-- plugin_pos_categories, plugin_pos_items, plugin_pos_orders

-- Add:
CREATE TABLE plugin_pos_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  special_instructions TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'ready', 'served'
  kds_station TEXT, -- 'kitchen', 'bar', 'grill'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES plugin_pos_orders(id),
  FOREIGN KEY (item_id) REFERENCES plugin_pos_items(id)
);

CREATE TABLE plugin_pos_modifiers (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_adjustment REAL DEFAULT 0,
  is_required BOOLEAN DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES plugin_pos_items(id)
);

CREATE TABLE plugin_pos_tables (
  id TEXT PRIMARY KEY,
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'occupied', 'reserved'
  current_order_id TEXT,
  location TEXT -- 'indoor', 'outdoor', 'bar'
);

CREATE TABLE plugin_pos_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash', 'card', 'room_charge', 'loyalty_points'
  status TEXT DEFAULT 'pending',
  processed_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES plugin_pos_orders(id)
);

CREATE TABLE plugin_pos_inventory_links (
  item_id TEXT PRIMARY KEY,
  inventory_item_id TEXT, -- link to inventory-waste plugin
  deduct_quantity REAL, -- amount to deduct per order
  FOREIGN KEY (item_id) REFERENCES plugin_pos_items(id)
);
```

**KDS Routes** (`plugins/pos-kds/src/routes/kds.ts` — create this):
```typescript
import { Hono } from 'hono';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function kdsRouter(api: PluginAPI) {
  const app = new Hono();
  
  // Auth middleware
  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });
  
  // Get orders by station
  app.get('/orders', async (c) => {
    const station = c.req.query('station') || 'kitchen'; // kitchen, bar, grill
    const status = c.req.query('status') || 'pending'; // pending, preparing, ready
    
    const orders = await api.db.query(`
      SELECT o.*, oi.*, poi.quantity, poi.special_instructions
      FROM plugin_pos_orders o
      JOIN plugin_pos_order_items oi ON oi.order_id = o.id
      JOIN plugin_pos_items i ON i.id = oi.item_id
      WHERE oi.kds_station = ? AND oi.status = ?
      ORDER BY o.created_at ASC
    `, [station, status]);
    
    return c.json({ orders });
  });
  
  // Update item status
  app.patch('/items/:id/status', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    
    await api.db.execute(
      'UPDATE plugin_pos_order_items SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // Emit for real-time KDS updates
    await api.executeHook('KDS_ITEM_STATUS_CHANGED', { id, status });
    
    return c.json({ success: true, id, status });
  });
  
  // Real-time updates via SSE
  app.get('/stream', async (c) => {
    const stream = new ReadableStream({
      start(controller) {
        // Subscribe to KDS updates
        const unsubscribe = api.hooks.subscribe('KDS_ITEM_STATUS_CHANGED', (data) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        });
        
        c.req.signal.addEventListener('abort', () => {
          unsubscribe();
          controller.close();
        });
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  });
  
  return app;
}
```

**Table Management**:
```typescript
// plugins/pos-kds/src/routes/tables.ts
export function tableRouter(api: PluginAPI) {
  return {
    GET: async () => {
      const tables = await api.db.query('SELECT * FROM plugin_pos_tables ORDER BY table_number');
      return Response.json({ tables });
    },
    
    POST: async (req) => {
      const { table_number, capacity, location } = await req.json();
      const id = crypto.randomUUID();
      await api.db.execute(
        `INSERT INTO plugin_pos_tables (id, table_number, capacity, location) VALUES (?, ?, ?, ?)`,
        [id, table_number, capacity, location]
      );
      return Response.json({ id }, { status: 201 });
    },
    
    // Assign order to table
    PATCH: async (req) => {
      const { table_id, order_id, status } = await req.json();
      await api.db.execute(
        `UPDATE plugin_pos_tables SET current_order_id = ?, status = ? WHERE id = ?`,
        [order_id, status, table_id]
      );
      return Response.json({ success: true });
    }
  };
}
```

**Agent Assignment**: @plugin_operations + @backend_architect

---

#### E. Inventory & Waste Plugin — Full Stock Management

**Current State**: Basic tables
**Required Features**:

**Extended Schema**:
```sql
-- Existing: plugin_inventory_items, plugin_waste_logs

-- Add:
CREATE TABLE plugin_inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'food', 'beverage', 'supplies', 'equipment'
  par_level REAL, -- minimum stock before reorder
  reorder_point REAL,
  reorder_quantity REAL,
  unit_of_measure TEXT, -- 'kg', 'liters', 'units', 'boxes'
  storage_location TEXT,
  is_active BOOLEAN DEFAULT 1
);

CREATE TABLE plugin_inventory_stock (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  quantity_reserved REAL DEFAULT 0, -- for pending orders
  quantity_available AS (quantity_on_hand - quantity_reserved),
  unit_cost REAL,
  last_counted_at INTEGER,
  location TEXT,
  FOREIGN KEY (item_id) REFERENCES plugin_inventory_items(id)
);

CREATE TABLE plugin_inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'consumption', 'adjustment', 'waste', 'transfer'
  quantity REAL NOT NULL,
  unit_cost REAL,
  reference_type TEXT, -- 'po', 'order', 'waste_report'
  reference_id TEXT,
  performed_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES plugin_inventory_items(id)
);

CREATE TABLE plugin_inventory_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT 1
);

CREATE TABLE plugin_inventory_purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'partial', 'received', 'cancelled'
  total_amount REAL,
  ordered_at INTEGER,
  expected_delivery INTEGER,
  received_at INTEGER,
  FOREIGN KEY (supplier_id) REFERENCES plugin_inventory_suppliers(id)
);

CREATE TABLE plugin_inventory_po_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity_ordered REAL NOT NULL,
  quantity_received REAL DEFAULT 0,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  FOREIGN KEY (po_id) REFERENCES plugin_inventory_purchase_orders(id),
  FOREIGN KEY (item_id) REFERENCES plugin_inventory_items(id)
);
```

**Stock Management API**:
```typescript
// plugins/inventory-waste/src/routes/stock.ts
export function stockRouter(api: PluginAPI) {
  return {
    // Get current stock levels
    GET: async (req) => {
      const { category, low_stock } = new URL(req.url).searchParams;
      let sql = `
        SELECT i.*, s.quantity_on_hand, s.quantity_reserved, s.quantity_available,
               c.name as category_name, c.par_level, c.reorder_point
        FROM plugin_inventory_items i
        LEFT JOIN plugin_inventory_stock s ON s.item_id = i.id
        LEFT JOIN plugin_inventory_categories c ON c.id = i.category_id
        WHERE 1=1
      `;
      
      if (category) sql += ` AND c.id = '${category}'`;
      if (low_stock === 'true') {
        sql += ` AND s.quantity_available <= c.reorder_point`;
      }
      
      const items = await api.db.query(sql);
      return Response.json({ items });
    },
    
    // Stock adjustment (manual count, damage, etc.)
    POST: async (req) => {
      const { item_id, quantity, reason, notes } = await req.json();
      
      await api.db.transaction(async (trx) => {
        // Update stock
        await trx.execute(
          `UPDATE plugin_inventory_stock 
           SET quantity_on_hand = quantity_on_hand + ?, last_counted_at = ?
           WHERE item_id = ?`,
          [quantity, Date.now(), item_id]
        );
        
        // Log transaction
        await trx.execute(
          `INSERT INTO plugin_inventory_transactions 
           (id, item_id, transaction_type, quantity, notes, created_at)
           VALUES (?, ?, 'adjustment', ?, ?, ?)`,
          [crypto.randomUUID(), item_id, quantity, notes, Date.now()]
        );
      });
      
      return Response.json({ success: true });
    },
    
    // Purchase Order Management
    '/purchase-orders': {
      GET: async () => {
        const pos = await api.db.query(`
          SELECT po.*, s.name as supplier_name,
                 COUNT(poi.id) as item_count,
                 SUM(poi.total_price) as total
          FROM plugin_inventory_purchase_orders po
          LEFT JOIN plugin_inventory_suppliers s ON s.id = po.supplier_id
          LEFT JOIN plugin_inventory_po_items poi ON poi.po_id = po.id
          GROUP BY po.id
          ORDER BY po.ordered_at DESC
        `);
        return Response.json({ purchase_orders: pos });
      },
      
      POST: async (req) => {
        const { supplier_id, items } = await req.json();
        const po_number = `PO-${Date.now()}`;
        const po_id = crypto.randomUUID();
        
        await api.db.transaction(async (trx) => {
          // Create PO
          await trx.execute(
            `INSERT INTO plugin_inventory_purchase_orders 
             (id, po_number, supplier_id, status, ordered_at)
             VALUES (?, ?, ?, 'draft', ?)`,
            [po_id, po_number, supplier_id, Date.now()]
          );
          
          // Add items
          for (const item of items) {
            await trx.execute(
              `INSERT INTO plugin_inventory_po_items
               (id, po_id, item_id, quantity_ordered, unit_price, total_price)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), po_id, item.id, item.quantity, item.unit_price, 
               item.quantity * item.unit_price]
            );
          }
        });
        
        return Response.json({ po_number, id: po_id }, { status: 201 });
      }
    }
  };
}
```

**Waste Tracking**:
```typescript
// Enhanced waste logging with reasons and trends
export function wasteRouter(api: PluginAPI) {
  return {
    POST: async (req) => {
      const { item_id, quantity, reason, notes, photo_url } = await req.json();
      
      const validReasons = [
        'expired', 'spoiled', 'overproduction', 'dropped',
        'returned', 'quality_issue', 'end_of_day', 'other'
      ];
      
      if (!validReasons.includes(reason)) {
        return Response.json({ error: 'Invalid reason' }, { status: 400 });
      }
      
      await api.db.transaction(async (trx) => {
        // Log waste
        await trx.execute(
          `INSERT INTO plugin_waste_logs 
           (id, item_id, quantity, reason, notes, photo_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), item_id, quantity, reason, notes, photo_url, Date.now()]
        );
        
        // Deduct from stock
        await trx.execute(
          `UPDATE plugin_inventory_stock 
           SET quantity_on_hand = quantity_on_hand - ?
           WHERE item_id = ?`,
          [quantity, item_id]
        );
        
        // Log transaction
        await trx.execute(
          `INSERT INTO plugin_inventory_transactions
           (id, item_id, transaction_type, quantity, notes, created_at)
           VALUES (?, ?, 'waste', ?, ?, ?)`,
          [crypto.randomUUID(), item_id, -quantity, reason, Date.now()]
        );
      });
      
      return Response.json({ success: true });
    },
    
    // Waste reports and analytics
    '/reports': {
      GET: async (req) => {
        const { start_date, end_date, group_by } = new URL(req.url).searchParams;
        
        const report = await api.db.query(`
          SELECT 
            ${group_by === 'item' ? 'i.name' : 'w.reason'} as group_key,
            SUM(w.quantity) as total_quantity,
            SUM(w.quantity * s.unit_cost) as total_cost,
            COUNT(*) as incident_count
          FROM plugin_waste_logs w
          JOIN plugin_inventory_items i ON i.id = w.item_id
          LEFT JOIN plugin_inventory_stock s ON s.item_id = w.item_id
          WHERE w.created_at >= ? AND w.created_at <= ?
          GROUP BY ${group_by === 'item' ? 'i.name' : 'w.reason'}
          ORDER BY total_cost DESC
        `, [start_date, end_date]);
        
        return Response.json({ report });
      }
    }
  };
}
```

**Agent Assignment**: @plugin_operations + @backend_architect

---

#### F. Staff Roster — Full Workforce Management

**Current State**: Basic shift listing
**Required Features**:

**Extended Schema**:
```sql
-- Existing: staff_shifts

-- Add:
CREATE TABLE plugin_staff_employees (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE, -- link to auth system
  employee_number TEXT UNIQUE,
  department TEXT, -- 'housekeeping', 'kitchen', 'front_desk', 'maintenance'
  position TEXT,
  employment_type TEXT, -- 'full_time', 'part_time', 'contractor'
  hourly_rate REAL,
  salary REAL,
  hire_date TEXT,
  termination_date TEXT,
  is_active BOOLEAN DEFAULT 1,
  emergency_contact TEXT,
  notes TEXT
);

CREATE TABLE plugin_staff_schedules (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  week_starting TEXT NOT NULL, -- Monday of the week
  schedule_data TEXT NOT NULL, -- JSON: {monday: {start: '09:00', end: '17:00', ...}}
  status TEXT DEFAULT 'draft', -- 'draft', 'published'
  created_by TEXT,
  published_at INTEGER,
  FOREIGN KEY (employee_id) REFERENCES plugin_staff_employees(id)
);

CREATE TABLE plugin_staff_time_clocks (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  shift_id TEXT,
  clock_in INTEGER NOT NULL,
  clock_out INTEGER,
  clock_in_location TEXT,
  clock_out_location TEXT,
  clock_in_photo TEXT, -- optional photo verification
  clock_out_photo TEXT,
  approved_by TEXT,
  approved_at INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  FOREIGN KEY (employee_id) REFERENCES plugin_staff_employees(id)
);

CREATE TABLE plugin_staff_leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL, -- 'vacation', 'sick', 'personal', 'unpaid'
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at INTEGER NOT NULL,
  approved_by TEXT,
  approved_at INTEGER,
  FOREIGN KEY (employee_id) REFERENCES plugin_staff_employees(id)
);
```

**Full API**:
```typescript
// plugins/staff-roster/src/routes/index.ts
export function staffRouter(api: PluginAPI) {
  return {
    // Employee Management
    '/employees': {
      GET: async () => {
        const employees = await api.db.query(`
          SELECT e.*, u.email, u.name as user_name
          FROM plugin_staff_employees e
          LEFT JOIN users u ON u.id = e.user_id
          WHERE e.is_active = 1
          ORDER BY e.department, e.position
        `);
        return Response.json({ employees });
      },
      
      POST: async (req) => {
        const body = await req.json();
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_staff_employees 
           (id, user_id, employee_number, department, position, employment_type, 
            hourly_rate, hire_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, body.user_id, body.employee_number, body.department, 
           body.position, body.employment_type, body.hourly_rate, 
           body.hire_date, Date.now()]
        );
        return Response.json({ id }, { status: 201 });
      }
    },
    
    // Shift Scheduling (enhance existing)
    '/shifts': {
      GET: async (req) => {
        const { start, end, employee_id } = new URL(req.url).searchParams;
        let sql = `
          SELECT s.*, e.employee_number, u.name as employee_name,
                 e.department, e.position
          FROM staff_shifts s
          JOIN plugin_staff_employees e ON e.id = s.user_id
          LEFT JOIN users u ON u.id = e.user_id
          WHERE s.shift_start >= ? AND s.shift_end <= ?
        `;
        if (employee_id) sql += ` AND s.user_id = '${employee_id}'`;
        sql += ` ORDER BY s.shift_start`;
        
        const shifts = await api.db.query(sql, [start, end]);
        return Response.json({ shifts });
      },
      
      POST: async (req) => {
        // Create single shift or recurring pattern
        const body = await req.json();
        const shifts = await createShift(api.db, body);
        return Response.json({ shifts }, { status: 201 });
      },
      
      // Bulk schedule generation
      '/bulk': {
        POST: async (req) => {
          const { employee_id, pattern, start_date, weeks } = await req.json();
          const shifts = await generateScheduleFromPattern(api.db, {
            employee_id, pattern, start_date, weeks
          });
          return Response.json({ shifts }, { status: 201 });
        }
      }
    },
    
    // Time Clock
    '/time-clock': {
      POST: async (req) => {
        const { employee_id, action, location, photo_url } = await req.json();
        
        if (action === 'clock_in') {
          const id = crypto.randomUUID();
          await api.db.execute(
            `INSERT INTO plugin_staff_time_clocks
             (id, employee_id, clock_in, clock_in_location, clock_in_photo, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, employee_id, Date.now(), location, photo_url, Date.now()]
          );
          return Response.json({ id, clock_in: Date.now() });
        }
        
        if (action === 'clock_out') {
          const { id } = await req.json();
          await api.db.execute(
            `UPDATE plugin_staff_time_clocks
             SET clock_out = ?, clock_out_location = ?, clock_out_photo = ?
             WHERE id = ?`,
            [Date.now(), location, photo_url, id]
          );
          return Response.json({ success: true });
        }
      },
      
      GET: async (req) => {
        const { employee_id, date } = new URL(req.url).searchParams;
        const records = await api.db.query(`
          SELECT * FROM plugin_staff_time_clocks
          WHERE employee_id = ? AND DATE(clock_in / 1000, 'unixepoch') = ?
          ORDER BY clock_in DESC
        `, [employee_id, date]);
        return Response.json({ records });
      }
    },
    
    // Leave Management
    '/leave': {
      GET: async (req) => {
        const { status, employee_id } = new URL(req.url).searchParams;
        let sql = `
          SELECT lr.*, e.employee_number, u.name as employee_name
          FROM plugin_staff_leave_requests lr
          JOIN plugin_staff_employees e ON e.id = lr.employee_id
          LEFT JOIN users u ON u.id = e.user_id
          WHERE 1=1
        `;
        if (status) sql += ` AND lr.status = '${status}'`;
        if (employee_id) sql += ` AND lr.employee_id = '${employee_id}'`;
        sql += ` ORDER BY lr.requested_at DESC`;
        
        const requests = await api.db.query(sql);
        return Response.json({ requests });
      },
      
      POST: async (req) => {
        const body = await req.json();
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_staff_leave_requests
           (id, employee_id, leave_type, start_date, end_date, days_requested, 
            reason, requested_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, body.employee_id, body.leave_type, body.start_date, 
           body.end_date, body.days_requested, body.reason, Date.now()]
        );
        return Response.json({ id }, { status: 201 });
      },
      
      PATCH: async (req) => {
        const { id, status, approved_by } = await req.json();
        await api.db.execute(
          `UPDATE plugin_staff_leave_requests
           SET status = ?, approved_by = ?, approved_at = ?
           WHERE id = ?`,
          [status, approved_by, Date.now(), id]
        );
        return Response.json({ success: true });
      }
    },
    
    // Payroll Reports
    '/payroll': {
      GET: async (req) => {
        const { start_date, end_date } = new URL(req.url).searchParams;
        const report = await api.db.query(`
          SELECT 
            e.id as employee_id,
            e.employee_number,
            u.name,
            e.hourly_rate,
            COUNT(tc.id) as shifts_worked,
            SUM((tc.clock_out - tc.clock_in) / 3600000.0) as hours_worked,
            SUM((tc.clock_out - tc.clock_in) / 3600000.0 * e.hourly_rate) as gross_pay
          FROM plugin_staff_employees e
          LEFT JOIN users u ON u.id = e.user_id
          LEFT JOIN plugin_staff_time_clocks tc ON 
            tc.employee_id = e.id AND 
            tc.status = 'approved' AND
            DATE(tc.clock_in / 1000, 'unixepoch') BETWEEN ? AND ?
          WHERE e.is_active = 1
          GROUP BY e.id
          ORDER BY u.name
        `, [start_date, end_date]);
        return Response.json({ report });
      }
    }
  };
}
```

**Agent Assignment**: @plugin_operations + @backend_architect

---

### 1.3 Plugin UI Components

All plugins need complete UI implementations. For each plugin, create:

```typescript
// plugins/{name}/src/ui.tsx

// 1. Dashboard Widget (for manager dashboard)
export function DashboardWidget({ api, tenantId }: { api: PluginAPI; tenantId: string }) {
  // Real-time metrics, quick actions
}

// 2. Full Management Page
export function AdminPage({ api }: { api: PluginAPI }) {
  // Complete CRUD interface
}

// 3. Settings Page (if applicable)
export function SettingsPanel({ api }: { api: PluginAPI }) {
  // Configuration UI
}

// 4. Guest-Facing Components (if applicable)
export function GuestWidget({ api, guestId }: { api: PluginAPI; guestId: string }) {
  // Guest self-service features
}
```

**Agent Assignment**: @frontend_dashboards + @frontend_marketplace

---

### 1.4 Plugin Integration & Hooks

Ensure all plugins properly integrate via hooks:

```typescript
// plugins/booking/src/hooks.ts
export const hooks = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  CHECKIN_COMPLETED: 'checkin.completed',
  CHECKOUT_COMPLETED: 'checkout.completed',
};

// plugins/housekeeping/src/index.ts
api.hooks.register('checkout.completed', async (data) => {
  await createCleaningTask(api, data);
});

// plugins/loyalty/src/index.ts  
api.hooks.register('booking.created', async (data) => {
  await awardPoints(api, data.guestId, calculatePoints(data.total));
});

// plugins/inventory-waste/src/index.ts
api.hooks.register('pos.order_created', async (data) => {
  await deductInventory(api, data.items);
});
```

---

## Phase 2: Performance Optimization (Priority: HIGH)

### 2.1 Database Optimization

**Agent**: @db_architect + @backend_architect

#### A. Add Missing Indexes

```sql
-- Critical indexes for performance
CREATE INDEX idx_bookings_listing_dates ON plugin_booking_bookings(listing_id, check_in, check_out);
CREATE INDEX idx_bookings_guest_email ON plugin_booking_bookings(guest_email);
CREATE INDEX idx_bookings_status ON plugin_booking_bookings(status);

CREATE INDEX idx_availability_room_date ON plugin_booking_room_availability(room_id, date);

CREATE INDEX idx_housekeeping_room_status ON plugin_housekeeping_tasks(room_id, status);
CREATE INDEX idx_housekeeping_assigned ON plugin_housekeeping_tasks(assigned_to, status);

CREATE INDEX idx_pos_orders_status ON plugin_pos_orders(status, created_at);
CREATE INDEX idx_pos_order_items_order ON plugin_pos_order_items(order_id);

CREATE INDEX idx_inventory_transactions_item ON plugin_inventory_transactions(item_id, created_at);

CREATE INDEX idx_staff_shifts_employee ON staff_shifts(user_id, shift_start, shift_end);

CREATE INDEX idx_ota_reservations_channel ON plugin_ota_reservations(channel_id, imported_at);
```

#### B. Query Optimization

```typescript
// Before (N+1 problem):
const bookings = await db.query('SELECT * FROM bookings');
for (const booking of bookings) {
  const guest = await db.query('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);
  // ...
}

// After (Single query with JOIN):
const bookings = await db.query(`
  SELECT b.*, g.name as guest_name, g.email as guest_email
  FROM plugin_booking_bookings b
  LEFT JOIN guests g ON g.id = b.guest_id
  WHERE b.listing_id = ?
  ORDER BY b.check_in DESC
`, [listingId]);
```

#### C. Connection Pooling (for PostgreSQL)

```typescript
// src/lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function queryWithPool(sql: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
```

### 2.2 API Response Optimization

**Agent**: @backend_architect

#### A. Response Caching

```typescript
// src/lib/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

export async function cachedQuery(key: string, ttl: number, fn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached) return cached;
  
  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

// Usage in API routes
export async function GET(req: Request) {
  const cacheKey = `availability:${listingId}:${checkIn}:${checkOut}`;
  
  const result = await cachedQuery(cacheKey, 60, async () => {
    return await roomService.checkAvailability({ listingId, checkIn, checkOut });
  });
  
  return Response.json(result);
}
```

#### B. Request Batching

```typescript
// Batch multiple availability checks into single query
export async function batchCheckAvailability(requests: AvailabilityRequest[]) {
  const roomIds = requests.map(r => r.roomId).join(',');
  const dateRanges = requests.map(r => `(room_id = '${r.roomId}' AND date BETWEEN '${r.checkIn}' AND '${r.checkOut}')`).join(' OR ');
  
  const availability = await db.query(`
    SELECT room_id, date, available 
    FROM plugin_booking_room_availability
    WHERE ${dateRanges}
  `);
  
  // Group by request
  return groupBy(availability, 'room_id');
}
```

### 2.3 Frontend Performance

**Agent**: @frontend_marketplace + @frontend_dashboards

#### A. Code Splitting

```typescript
// Dynamic imports for heavy components
const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <Skeleton height={300} />,
  ssr: false
});

// Route-based splitting
const BookingDashboard = dynamic(() => import('./BookingDashboard'));
const HousekeepingDashboard = dynamic(() => import('./HousekeepingDashboard'));
```

#### B. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={property.image}
  alt={property.name}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={property.thumbnail}
  loading="lazy"
  quality={75}
/>
```

#### C. Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Identify large dependencies
npm run analyze
```

### 2.4 Edge Caching & CDN

**Agent**: @devops

```nginx
# nginx-unified.conf
location /api/public/ {
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
}

location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /images/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Phase 3: Comprehensive Documentation (Priority: HIGH)

### 3.1 Documentation Structure

**Agent**: @tech_writer

```
docs/
├── index.md                    # Main documentation hub
├── architecture/
│   ├── overview.md             # System architecture
│   ├── plugins.md              # Plugin system
│   ├── multi-tenancy.md        # Tenant architecture
│   ├── auth.md                 # Authentication & authorization
│   └── deployment.md           # Deployment guide
├── user-guides/
│   ├── README.md
│   ├── master-admin.md         # Platform admin guide
│   ├── property-manager.md     # Tenant owner guide
│   ├── staff.md                # Staff member guide
│   └── guest.md                # Guest user guide
├── api/
│   ├── README.md
│   ├── authentication.md
│   ├── core-api.md
│   ├── plugin-api.md
│   └── webhooks.md
├── plugins/
│   ├── README.md
│   ├── booking.md
│   ├── housekeeping.md
│   ├── maintenance.md
│   ├── pos-kds.md
│   ├── inventory-waste.md
│   ├── staff-roster.md
│   ├── loyalty.md
│   ├── crm.md
│   ├── ota-channel-manager.md
│   └── ... (one per plugin)
├── development/
│   ├── setup.md
│   ├── plugins.md              # Plugin development guide
│   ├── contributing.md
│   └── testing.md
└── deployment/
    ├── requirements.md
    ├── installation.md
    ├── configuration.md
    ├── scaling.md
    └── troubleshooting.md
```

### 3.2 Plugin Documentation Template

Each plugin doc should include:

```markdown
# {Plugin Name}

## Overview
- Purpose and features
- Target users
- Integration points

## Installation
```bash
npm run plugin:install {name}
```

## Configuration
### Database Tables
### Environment Variables
### Settings UI

## API Reference
### Routes
### Request/Response Examples
### Error Codes

## Hooks
### Emitted Hooks
### Consumed Hooks

## UI Components
### Slots
### Props
### Usage Examples

## Integration Examples
### With Other Plugins
### Custom Code

## Troubleshooting
### Common Issues
### Debug Mode
```

### 3.3 API Documentation

**Auto-generate from code**:

```typescript
// src/lib/api-docs.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function generateApiDocs() {
  const schemas = {
    createBooking: zodToJsonSchema(createBookingSchema),
    checkAvailability: zodToJsonSchema(checkAvailabilitySchema),
    // ... all schemas
  };
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'SinaiCamps API',
      version: '1.0.0'
    },
    paths: extractRoutesFromCode(),
    components: { schemas }
  };
}
```

Generate:
- OpenAPI/Swagger spec
- Postman collection
- Markdown reference

### 3.4 User Guides

**Master Admin Guide**:
- Platform setup
- Tenant management
- Plugin management
- System monitoring
- Troubleshooting

**Property Manager Guide**:
- Onboarding checklist
- Listing setup
- Booking management
- Staff management
- Financial reports

**Staff Guide**:
- Daily operations
- Check-in/check-out
- Housekeeping tasks
- POS operations
- Time clock

**Guest Guide**:
- Searching properties
- Making bookings
- Payment options
- Check-in process
- Loyalty program

### 3.5 Interactive Documentation

Add to the app:

```typescript
// src/app/[locale]/docs/page.tsx
export default function InteractiveDocs() {
  return (
    <DocsLayout>
      <SearchableNav />
      <ContentArea>
        <MarkdownRenderer />
        <InteractiveApiTester />
        <CodePlayground />
      </ContentArea>
    </DocsLayout>
  );
}
```

---

## Execution Order

### Week 1: Critical Plugins
- Day 1-2: Booking plugin completion
- Day 3: Housekeeping plugin
- Day 4: Maintenance plugin
- Day 5: Testing & integration

### Week 2: Operations Plugins  
- Day 1-2: POS-KDS plugin
- Day 3-4: Inventory-Waste plugin
- Day 5: Staff Roster plugin

### Week 3: Integration & Marketing
- Day 1-3: OTA Channel Manager
- Day 4: CRM + Guest CRM
- Day 5: Marketing Automation

### Week 4: Performance & Docs
- Day 1-2: Database optimization
- Day 3: Frontend optimization
- Day 4: API documentation
- Day 5: User guides

---

## Success Metrics

### Plugin Implementation
- ✅ 24 plugins with full feature sets
- ✅ All plugins have complete UI
- ✅ All plugins have proper tests
- ✅ All plugins properly integrated via hooks

### Performance
- ✅ API response time < 200ms (p95)
- ✅ Page load time < 2s (First Contentful Paint)
- ✅ Bundle size optimized
- ✅ Database queries < 50ms

### Documentation
- ✅ Complete API documentation (OpenAPI spec)
- ✅ User guides for all 4 user types
- ✅ Plugin development guide
- ✅ Interactive documentation site

---

**Execute all phases. Report progress per plugin and per optimization area.**
