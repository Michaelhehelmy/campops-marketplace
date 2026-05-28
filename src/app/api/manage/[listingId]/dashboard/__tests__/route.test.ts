import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const LISTING_ID = 'prop-dash-test-1';
const LISTING_SLUG = 'dash-test-camp';
const ROOM_ID = 'room-dash-1';

function makeRequest(listingId: string): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/manage/${listingId}/dashboard`));
}

describe('GET /api/manage/[listingId]/dashboard', () => {
  beforeEach(() => {
    db.prepare(`CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY, name TEXT, slug TEXT, owner_id TEXT,
      is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS plugin_booking_bookings (
      id TEXT PRIMARY KEY, listing_id TEXT, room_id TEXT,
      guest_name TEXT, guest_email TEXT,
      check_in TEXT, check_out TEXT, status TEXT,
      total_price REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS plugin_booking_rooms (
      id TEXT PRIMARY KEY, listing_id TEXT, name TEXT,
      capacity INTEGER DEFAULT 2, base_price REAL DEFAULT 100
    )`).run();

    db.prepare(`INSERT OR IGNORE INTO properties (id, name, slug, owner_id)
      VALUES (?, ?, ?, 'owner-1')`).run(LISTING_ID, 'Dash Test Camp', LISTING_SLUG);
  });

  it('returns 404 for unknown property', async () => {
    const res = await GET(makeRequest('does-not-exist'), {
      params: { listingId: 'does-not-exist' },
    });
    expect(res.status).toBe(404);
  });

  it('returns zero stats for property with no data', async () => {
    const res = await GET(makeRequest(LISTING_ID), {
      params: { listingId: LISTING_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.totalBookings).toBe(0);
    expect(body.stats.activeBookings).toBe(0);
    expect(body.stats.totalRevenue).toBe(0);
    expect(body.stats.totalRooms).toBe(0);
    expect(body.recentBookings).toEqual([]);
  });

  it('returns correct counts with bookings', async () => {
    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-1', LISTING_ID, ROOM_ID, 'Alice', 'a@t.com', '2026-07-01', '2026-07-05', 'confirmed', 400);

    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-2', LISTING_ID, ROOM_ID, 'Bob', 'b@t.com', '2026-06-10', '2026-06-12', 'checked_in', 200);

    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-3', LISTING_ID, ROOM_ID, 'Carol', 'c@t.com', '2026-05-01', '2026-05-03', 'cancelled', 150);

    const res = await GET(makeRequest(LISTING_ID), {
      params: { listingId: LISTING_ID },
    });
    const body = await res.json();
    expect(body.stats.totalBookings).toBe(3);
    expect(body.stats.activeBookings).toBe(2);
    expect(body.stats.cancelledBookings).toBe(1);
    expect(body.stats.totalRevenue).toBe(600);
    expect(body.recentBookings).toHaveLength(3);
  });

  it('returns room count when rooms exist', async () => {
    db.prepare(
      `INSERT INTO plugin_booking_rooms (id, listing_id, name) VALUES (?, ?, ?)`
    ).run('r-1', LISTING_ID, 'Tent A');
    db.prepare(
      `INSERT INTO plugin_booking_rooms (id, listing_id, name) VALUES (?, ?, ?)`
    ).run('r-2', LISTING_ID, 'Tent B');

    const res = await GET(makeRequest(LISTING_ID), {
      params: { listingId: LISTING_ID },
    });
    const body = await res.json();
    expect(body.stats.totalRooms).toBe(2);
  });

  it('supports slug lookup for property', async () => {
    const res = await GET(makeRequest(LISTING_SLUG), {
      params: { listingId: LISTING_SLUG },
    });
    expect(res.status).toBe(200);
  });

  it('returns recentBookings ordered by created_at desc', async () => {
    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-a', LISTING_ID, ROOM_ID, 'A', 'a@t.com', '2026-08-01', '2026-08-03', 'confirmed', 100, '2026-08-01T00:00:00');
    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-b', LISTING_ID, ROOM_ID, 'B', 'b@t.com', '2026-08-05', '2026-08-07', 'confirmed', 200, '2026-08-02T00:00:00');

    const res = await GET(makeRequest(LISTING_ID), {
      params: { listingId: LISTING_ID },
    });
    const body = await res.json();
    expect(body.recentBookings[0].guestName).toBe('B');
    expect(body.recentBookings[1].guestName).toBe('A');
  });

  it('excludes cancelled from revenue calculation', async () => {
    db.prepare(
      `INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('bk-x', LISTING_ID, ROOM_ID, 'X', 'x@t.com', '2026-09-01', '2026-09-03', 'cancelled', 500);

    const res = await GET(makeRequest(LISTING_ID), {
      params: { listingId: LISTING_ID },
    });
    const body = await res.json();
    expect(body.stats.totalRevenue).toBe(0);
  });
});
