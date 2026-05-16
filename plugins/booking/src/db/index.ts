import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

/**
 * Booking Plugin Database
 * ───────────────────────
 * Drizzle ORM setup for booking plugin tables
 */

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export async function initTables() {
  const db = getDb();
  const sqlite = new Database(':memory:');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plugin_booking_rooms (
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
    );
    
    CREATE TABLE IF NOT EXISTS plugin_booking_room_availability (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      date TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES plugin_booking_rooms(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS bookings (
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
    );
  `);

  // Seed sample data for testing
  const now = Math.floor(Date.now() / 1000);

  // Insert sample room
  sqlite.exec(`
    INSERT OR IGNORE INTO plugin_booking_rooms 
    (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at)
    VALUES 
    ('room-1', '1', 'Standard Tent', 'Comfortable tent with basic amenities', 2, 100.00, 'USD', 1, ${now}, ${now}),
    ('room-2', '1', 'Deluxe Safari Tent', 'Luxury tent with en-suite bathroom', 4, 250.00, 'USD', 1, ${now}, ${now})
  `);

  // Insert sample availability for next 30 days
  const availabilityInserts = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    availabilityInserts.push(`('avail-${i}', 'room-1', '${dateStr}', 5, 100.00, ${now})`);
    availabilityInserts.push(`('avail-deluxe-${i}', 'room-2', '${dateStr}', 3, 250.00, ${now})`);
  }

  if (availabilityInserts.length > 0) {
    sqlite.exec(`
      INSERT INTO plugin_booking_room_availability 
      (id, room_id, date, available, price, created_at)
      VALUES ${availabilityInserts.join(',')}
    `);
  }
}

export { schema };
