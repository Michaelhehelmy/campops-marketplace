import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

const mockRun = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    platformName: 'Custom Marketplace',
    supportEmail: 'support@sinaicamps.com',
    currency: 'USD',
    timezone: 'UTC',
    commissionRate: 15.0,
    minBookingFee: 1.5,
  })
);
const mockPrepare = vi.hoisted(() => vi.fn().mockReturnThis());

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      prepare: mockPrepare,
      get: mockGet,
      run: mockRun,
    },
  };
});

vi.mock('@/lib/auth-middleware', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    requireRole: vi.fn().mockResolvedValue({
      user: { id: 'test-user', role: 'marketplace_master' },
      session: { id: 'test-session' },
    }),
    isErrorResponse: vi.fn().mockReturnValue(false),
  };
});

describe('Master Settings API Route', () => {
  it('GET should return merged settings from database', async () => {
    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platformName).toBe('Custom Marketplace');
    expect(data.commissionRate).toBe(15.0);
    expect(data.currency).toBe('USD');
  });

  it('GET should return default settings when no DB record exists', async () => {
    mockGet.mockReturnValueOnce(null);

    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platformName).toBe('SinaiCamps Marketplace');
    expect(data.commissionRate).toBe(10.0);
  });

  it('GET should return default settings if database throws', async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Table does not exist');
    });

    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('POST should update settings in database', async () => {
    const req = new NextRequest('http://localhost/api/master/settings', {
      method: 'POST',
      body: JSON.stringify({
        platformName: 'New Name',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it('POST should handle database errors gracefully', async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/master/settings', {
      method: 'POST',
      body: JSON.stringify({
        platformName: 'New Name',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
