import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Booking Plugin Database Schema
 * ──────────────────────────────
 * Defines tables for plugin_booking_rooms, availability, and bookings
 */

export const plugin_booking_rooms = sqliteTable('plugin_booking_rooms', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  capacity: integer('capacity').notNull().default(2),
  basePrice: real('base_price').notNull(),
  currency: text('currency').default('USD'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const roomAvailability = sqliteTable('plugin_booking_room_availability', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => plugin_booking_rooms.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD format
  available: integer('available').notNull().default(1),
  price: real('price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull(),
  roomId: text('room_id')
    .notNull()
    .references(() => plugin_booking_rooms.id, { onDelete: 'cascade' }),
  guestName: text('guest_name').notNull(),
  guestEmail: text('guest_email').notNull(),
  guestPhone: text('guest_phone'),
  checkIn: text('check_in').notNull(), // YYYY-MM-DD format
  checkOut: text('check_out').notNull(), // YYYY-MM-DD format
  adults: integer('adults').notNull().default(2),
  children: integer('children').notNull().default(0),
  totalPrice: real('total_price').notNull(),
  currency: text('currency').default('USD'),
  status: text('status').notNull().default('pending'), // pending, confirmed, checked_in, checked_out, cancelled
  specialRequests: text('special_requests'),
  paymentProvider: text('payment_provider').default('stripe'),
  paymentStatus: text('payment_status').default('pending'), // pending, paid, failed, refunded
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }),
  checkedOutAt: integer('checked_out_at', { mode: 'timestamp' }),
});
