import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { getSqlite } from '@/lib/db';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/public/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

let propertyIds: string[] = [];

beforeEach(() => {
  const db = getSqlite();
  const now = Math.floor(Date.now() / 1000);

  propertyIds = [];

  // Ensure test tables exist (resetMockStore in global afterEach drops them)
  db.prepare(`
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
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS plugin_booking_bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `).run();

  // Insert test properties with unique slugs
  const camps = [
    { name: 'Safari Camp', city: 'Sharm El-Sheikh', plan: 'premium', price: 200 },
    { name: 'Bedouin Nights', city: 'Dahab', plan: 'basic', price: 80 },
    { name: 'Mountain Retreat', city: 'St. Catherine', plan: 'basic', price: 60 },
    { name: 'Beach Paradise', city: 'Hurghada', plan: 'premium', price: 250 },
    { name: 'Oasis Camp', city: 'Siwa', plan: 'basic', price: 90 },
    { name: 'Sunset Dunes', city: 'Dahab', plan: 'elite', price: 350 },
    { name: 'Coral Reef Camp', city: 'Sharm El-Sheikh', plan: 'basic', price: 110 },
  ];

  for (const c of camps) {
    const id = uuidv4();
    propertyIds.push(id);
    db.prepare(`
      INSERT INTO properties (id, slug, name, description, city, country, plan, min_price_per_night, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 'Egypt', ?, ?, 1, ?)
    `).run(id, `s4-slug-${uuidv4().slice(0, 8)}`, c.name, `A ${c.name.toLowerCase()} test description`, c.city, c.plan, c.price, now);
  }

  // Seed rooms for guest capacity tests on first two properties
  db.prepare(
    'INSERT OR IGNORE INTO plugin_booking_rooms (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run('s4-room-1', propertyIds[0], 'Standard Tent', 'Basic tent', 2, 200, 'USD', now, now);
  db.prepare(
    'INSERT OR IGNORE INTO plugin_booking_rooms (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run('s4-room-2', propertyIds[0], 'Family Tent', 'Large tent', 6, 400, 'USD', now, now);
  db.prepare(
    'INSERT OR IGNORE INTO plugin_booking_rooms (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run('s4-room-3', propertyIds[1], 'Standard Tent', 'Basic tent', 2, 80, 'USD', now, now);
});

afterEach(() => {
  const db = getSqlite();
  for (const id of propertyIds) {
    db.prepare('DELETE FROM plugin_booking_rooms WHERE listing_id = ?').run(id);
    db.prepare('DELETE FROM properties WHERE id = ?').run(id);
  }
  propertyIds = [];
});

describe('GET /api/public/search', () => {
  it('returns all active properties without filters', async () => {
    const res = await GET(makeRequest({}));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties.length).toBeGreaterThanOrEqual(7);
    expect(data.totalCount).toBeGreaterThanOrEqual(7);
    expect(data.totalPages).toBeGreaterThanOrEqual(1);
    expect(data.page).toBe(1);
    expect(data.nights).toBe(1);
  });

  it('filters by text search (q)', async () => {
    const res = await GET(makeRequest({ q: 'Safari' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties.length).toBeGreaterThanOrEqual(1);
    expect(data.properties[0].name).toContain('Safari');
  });

  it('filters by destination (alias for q)', async () => {
    const res = await GET(makeRequest({ destination: 'Dahab' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties.every((p: any) => p.city === 'Dahab')).toBe(true);
  });

  it('filters by price range', async () => {
    const res = await GET(makeRequest({ minPrice: '100', maxPrice: '300' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties.length).toBeGreaterThanOrEqual(1);
    for (const p of data.properties) {
      expect(p.minPricePerNight).toBeGreaterThanOrEqual(100);
      expect(p.minPricePerNight).toBeLessThanOrEqual(300);
    }
  });

  it('filters by minimum price only', async () => {
    const res = await GET(makeRequest({ minPrice: '300' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    for (const p of data.properties) {
      expect(p.minPricePerNight).toBeGreaterThanOrEqual(300);
    }
  });

  it('filters by category (plan)', async () => {
    const res = await GET(makeRequest({ category: 'premium' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    for (const p of data.properties) {
      expect(p.type).toBe('premium');
    }
  });

  it('filters by guest capacity', async () => {
    const res = await GET(makeRequest({ guests: '3' }));
    const data = await res.json();
    const hasCap = data.properties.some((p: any) => p.id === propertyIds[0]);
    expect(hasCap).toBe(true);
  });

  it('paginates results', async () => {
    const res1 = await GET(makeRequest({ page: '1' }));
    const data1 = await res1.json();
    expect(data1.page).toBe(1);
    expect(data1.properties.length).toBe(data1.totalCount);

    const res2 = await GET(makeRequest({ page: '2' }));
    const data2 = await res2.json();
    expect(data2.page).toBe(2);
    expect(data2.properties.length).toBe(0);
  });

  it('returns 200 with empty results for non-matching search', async () => {
    const res = await GET(makeRequest({ q: 'xyznonexistent999' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.totalPages).toBe(0);
  });

  it('includes room types in response', async () => {
    const res = await GET(makeRequest({}));
    const data = await res.json();
    const withRooms = data.properties.find((p: any) => p.availableRoomTypes.length > 0);
    expect(withRooms).toBeDefined();
    expect(withRooms.availableRoomTypes[0]).toHaveProperty('id');
    expect(withRooms.availableRoomTypes[0]).toHaveProperty('name');
    expect(withRooms.availableRoomTypes[0]).toHaveProperty('price');
    expect(withRooms.availableRoomTypes[0]).toHaveProperty('capacity');
  });

  it('returns nights based on checkIn/checkOut', async () => {
    const res = await GET(makeRequest({ checkIn: '2026-06-01', checkOut: '2026-06-05' }));
    const data = await res.json();
    expect(data.checkIn).toBe('2026-06-01');
    expect(data.checkOut).toBe('2026-06-05');
    expect(data.nights).toBe(4);
  });
});
