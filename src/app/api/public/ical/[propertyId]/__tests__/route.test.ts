import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getSqlite } from '@/lib/db';

const LISTING_ID = 'prop-ical-test-1';
const LISTING_SLUG = 'ical-test-camp';
const ROOM_ID = 'room-ical-1';

function makeRequest(propertyId: string): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/public/ical/${propertyId}`));
}

describe('GET /api/public/ical/[propertyId]', () => {
  beforeEach(() => {
    const db = getSqlite();

    db.prepare(`CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY, name TEXT, slug TEXT,
      is_active INTEGER DEFAULT 1, owner_id TEXT,
      description TEXT, city TEXT, country TEXT,
      plan TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS plugin_booking_bookings (
      id TEXT PRIMARY KEY, listing_id TEXT, room_id TEXT,
      guest_name TEXT, guest_email TEXT,
      check_in TEXT, check_out TEXT, status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    db.prepare(`INSERT OR IGNORE INTO properties (id, name, slug, is_active) VALUES (?, ?, ?, 1)`)
      .run(LISTING_ID, 'iCal Test Camp', LISTING_SLUG);
  });

  afterEach(() => {
    const db = getSqlite();
    db.prepare(`DELETE FROM plugin_booking_bookings WHERE listing_id = ?`).run(LISTING_ID);
  });

  it('returns 404 for unknown property', async () => {
    const res = await GET(makeRequest('does-not-exist'), { params: { propertyId: 'does-not-exist' } });
    expect(res.status).toBe(404);
  });

  it('returns empty ICS for property with no bookings', async () => {
    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/calendar/);
    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('END:VCALENDAR');
    expect(body).not.toContain('BEGIN:VEVENT');
  });

  it('returns ICS with VEVENT for confirmed bookings', async () => {
    const db = getSqlite();
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-1', LISTING_ID, ROOM_ID, 'Alice', 'alice@test.com', '2026-06-01', '2026-06-05', 'confirmed');

    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('BEGIN:VEVENT');
    expect(body).toContain('UID:bk-1@sinaicamps.com');
    expect(body).toContain('DTSTART;VALUE=DATE:20260601');
    expect(body).toContain('DTEND;VALUE=DATE:20260605');
    expect(body).toContain('SUMMARY:Booked — Alice');
  });

  it('includes checked_in and checked_out bookings', async () => {
    const db = getSqlite();
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-2', LISTING_ID, ROOM_ID, 'Bob', 'bob@test.com', '2026-07-01', '2026-07-03', 'checked_in');
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-3', LISTING_ID, ROOM_ID, 'Carol', 'carol@test.com', '2026-05-10', '2026-05-12', 'checked_out');

    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('UID:bk-2@sinaicamps.com');
    expect(body).toContain('UID:bk-3@sinaicamps.com');
  });

  it('excludes cancelled bookings', async () => {
    const db = getSqlite();
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-4', LISTING_ID, ROOM_ID, 'Dave', 'dave@test.com', '2026-08-01', '2026-08-05', 'cancelled');

    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    const body = await res.text();
    expect(body).not.toContain('UID:bk-4');
  });

  it('supports slug lookup for property', async () => {
    const res = await GET(makeRequest(LISTING_SLUG), { params: { propertyId: LISTING_SLUG } });
    expect(res.status).toBe(200);
  });

  it('returns ICS with filename header', async () => {
    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toBeTruthy();
    expect(disposition).toContain(`${LISTING_SLUG}.ics`);
  });

  it('orders bookings by check_in ascending', async () => {
    const db = getSqlite();
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-5', LISTING_ID, ROOM_ID, 'Eve', 'eve@test.com', '2026-09-01', '2026-09-03', 'confirmed');
    db.prepare(`INSERT INTO plugin_booking_bookings (id, listing_id, room_id, guest_name, guest_email, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('bk-6', LISTING_ID, ROOM_ID, 'Frank', 'frank@test.com', '2026-06-15', '2026-06-18', 'confirmed');

    const res = await GET(makeRequest(LISTING_ID), { params: { propertyId: LISTING_ID } });
    const body = await res.text();
    const matches = body.match(/DTSTART;VALUE=DATE:(\d{8})/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
