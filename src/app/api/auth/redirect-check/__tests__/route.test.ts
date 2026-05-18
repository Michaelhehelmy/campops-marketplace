import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

describe('Redirect Check API Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.resetMockStore();
  });

  it('returns redirect: false when session is null', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/redirect-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.redirect).toBe(false);
  });

  it('returns redirect: false for master administrator', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'master-admin', role: 'master', email: 'master@sinaicamps.com' },
    });

    const req = new NextRequest('http://localhost/api/auth/redirect-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.redirect).toBe(false);
  });

  it('returns redirect: true for managers of ultimate-tier properties with verified custom domains', async () => {
    // 1. Mock session as manager user
    mockGetSession.mockResolvedValue({
      user: { id: 'admin-acacia', role: 'manager', email: 'admin@acaciacamp.com' },
    });

    // 2. Make request
    const req = new NextRequest('http://localhost/api/auth/redirect-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.redirect).toBe(true);
    expect(data.url).toBe('https://acaciacamp.com/en/manage/3');
  });

  it('returns redirect: false for managers of properties on basic plans', async () => {
    // manager@sinaicamps.com / manager-user-1 is manager for property ID 1 (Safari Camp) which is plan = 'premium', custom_domain = ''
    mockGetSession.mockResolvedValue({
      user: { id: 'manager-user-1', role: 'manager', email: 'manager@sinaicamps.com' },
    });

    const req = new NextRequest('http://localhost/api/auth/redirect-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.redirect).toBe(false);
  });

  it('returns redirect: true for guests who have a reservation at an ultimate-tier property', async () => {
    // 1. Add reservation for this guest email to link them to property ID 3 (Acacia Camp)
    db.prepare(`
      INSERT INTO reservations (id, user_id, property_id, guest_name, guest_email, status, check_in, check_out, total_price)
      VALUES ('res-acacia-guest', 'guest-user-1', '3', 'John Guest', 'guest@acaciacamp.com', 'confirmed', '2026-06-01', '2026-06-05', 500)
    `).run();

    // 2. Mock session as guest
    mockGetSession.mockResolvedValue({
      user: { id: 'guest-user-1', role: 'guest', email: 'guest@acaciacamp.com' },
    });

    const req = new NextRequest('http://localhost/api/auth/redirect-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.redirect).toBe(true);
    expect(data.url).toBe('https://acaciacamp.com/en/guest');
  });
});
