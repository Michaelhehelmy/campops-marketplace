import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockPrepare = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('@/lib/db', () => ({
  db: { prepare: mockPrepare },
}));

async function getRoute() {
  const { GET } = await import('../route');
  return { GET };
}

describe('GET /api/owner/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if session is not active', async () => {
    mockGetSession.mockResolvedValue(null);
    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/owner/me');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 200 if user is a direct owner of property', async () => {
    const mockUser = {
      id: 'user-owner',
      email: 'owner@example.com',
      name: 'Owner',
      role: 'manager',
    };
    const mockProperty = {
      id: 'prop-1',
      name: 'Acacia Camp',
      slug: 'acacia-camp',
      plan: 'pro',
      is_active: 1,
    };

    mockGetSession.mockResolvedValue({ user: mockUser });
    const getMock = vi.fn().mockResolvedValue(mockProperty);
    mockPrepare.mockReturnValue({ get: getMock, all: vi.fn(), run: vi.fn() });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/owner/me');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toEqual({
      id: 'user-owner',
      email: 'owner@example.com',
      name: 'Owner',
      role: 'manager',
    });
    expect(data.property).toEqual({
      id: 'prop-1',
      name: 'Acacia Camp',
      slug: 'acacia-camp',
      plan: 'pro',
      isActive: true,
    });
    expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM properties WHERE owner_id = ?');
    expect(getMock).toHaveBeenCalledWith('user-owner');
  });

  it('should return 200 if user is a staff member of property', async () => {
    const mockUser = { id: 'user-staff', email: 'staff@example.com', name: 'Staff', role: 'staff' };
    const mockStaffRecord = { property_id: 'prop-2' };
    const mockProperty = {
      id: 'prop-2',
      name: 'Acacia Staff Camp',
      slug: 'acacia-staff-camp',
      plan: null,
      is_active: 0,
    };

    mockGetSession.mockResolvedValue({ user: mockUser });
    const getMock = vi
      .fn()
      .mockResolvedValueOnce(null) // Not a direct owner
      .mockResolvedValueOnce(mockStaffRecord) // Is staff
      .mockResolvedValueOnce(mockProperty); // Fetch property record
    mockPrepare.mockReturnValue({ get: getMock, all: vi.fn(), run: vi.fn() });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/owner/me');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.property).toEqual({
      id: 'prop-2',
      name: 'Acacia Staff Camp',
      slug: 'acacia-staff-camp',
      plan: 'basic', // default fallback plan
      isActive: false,
    });
  });

  it('should return 404 if no associated property is found for owner/staff', async () => {
    const mockUser = {
      id: 'user-none',
      email: 'none@example.com',
      name: 'No Property',
      role: 'manager',
    };
    mockGetSession.mockResolvedValue({ user: mockUser });
    const getMock = vi
      .fn()
      .mockResolvedValueOnce(null) // Not owner
      .mockResolvedValueOnce(null); // Not staff
    mockPrepare.mockReturnValue({ get: getMock, all: vi.fn(), run: vi.fn() });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/owner/me');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('No associated property found');
  });

  it('should return 500 on database error during lookup', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-err' } });
    mockPrepare.mockImplementation(() => {
      throw new Error('Database select failed');
    });

    const { GET } = await getRoute();
    const req = new NextRequest('http://localhost/api/owner/me');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database select failed');
  });
});
