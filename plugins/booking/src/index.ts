import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { initTables } from './db/index.js';
import { registerRoutes } from './api/routes.js';
import { hooks } from './hooks.js';
import { BookingService } from './services/BookingService.js';
import { RoomService } from './services/RoomService.js';

/**
 * Booking Plugin Entry Point
 * ──────────────────────────
 * Follows the standard plugin template
 */
export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Booking Plugin...');

  // 1. Create database tables using plugin SDK
  await api.db.createTable(
    'rooms',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 2,
    base_price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  `
  );

  await api.db.createTable(
    'room_availability',
    `
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    date TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES plugin_booking_rooms(id) ON DELETE CASCADE
  `
  );

  await api.db.createTable(
    'bookings',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    adults INTEGER NOT NULL DEFAULT 2,
    children INTEGER NOT NULL DEFAULT 0,
    total_price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    special_requests TEXT,
    payment_provider TEXT DEFAULT 'stripe',
    payment_status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    checked_in_at INTEGER,
    checked_out_at INTEGER,
    FOREIGN KEY (room_id) REFERENCES plugin_booking_rooms(id) ON DELETE CASCADE
  `
  );

  // Seed sample data
  const now = Math.floor(Date.now() / 1000);
  await api.db.execute(`
    INSERT OR IGNORE INTO plugin_booking_rooms 
    (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at)
    VALUES 
    ('room-1', '1', 'Standard Tent', 'Comfortable tent with basic amenities', 2, 100.00, 'USD', 1, ${now}, ${now}),
    ('room-2', '1', 'Deluxe Safari Tent', 'Luxury tent with en-suite bathroom', 4, 250.00, 'USD', 1, ${now}, ${now})
  `);

  // Seed availability for next 90 days
  const availabilityInserts = [];
  for (let i = 0; i < 90; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    availabilityInserts.push(`('avail-${i}', 'room-1', '${dateStr}', 5, 100.00, ${now})`);
    availabilityInserts.push(`('avail-deluxe-${i}', 'room-2', '${dateStr}', 3, 250.00, ${now})`);
  }

  if (availabilityInserts.length > 0) {
    await api.db.execute(`
      INSERT OR IGNORE INTO plugin_booking_room_availability 
      (id, room_id, date, available, price, created_at)
      VALUES ${availabilityInserts.join(',')}
    `);
  }

  // 2. Register API routes
  const { bookingService, roomService } = registerRoutes(api);

  // 3. Register UI components via plugin SDK
  api.ui.addSlotComponent('public.booking', 'booking:PublicBookingWidget');
  api.ui.addSlotComponent('manager.bookings', 'booking:ManagerBookingsList');
  api.ui.addSlotComponent('owner.bookings', 'booking:ManagerBookingsList');
  api.ui.addSlotComponent('staff.checkins', 'booking:StaffCheckInPanel');
  api.ui.addSlotComponent('guest.dashboard', 'booking:GuestReservationsList');

  // 4. Register hooks for inter-plugin communication
  api.registerHook('BOOKING_CREATED', async (data: any) => {
    api.logger.info('Booking created hook received:', data);
    // CRM plugin might listen to this to log activity
    return data;
  });

  api.registerHook('CHECKIN_COMPLETED', async (data: any) => {
    api.logger.info('Check-in completed hook received:', data);
    // CRM plugin might listen to this to update guest activity
    return data;
  });

  api.registerHook('CHECKOUT_COMPLETED', async (data: any) => {
    api.logger.info('Check-out completed hook received:', data);
    // Finance plugin might listen to this for commission calculation
    return data;
  });

  // 5. Return public API for other plugins
  return {
    bookingService,
    roomService,
    hooks,
  };
}
