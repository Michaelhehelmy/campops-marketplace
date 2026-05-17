import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    db: {
      prepare: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        config: JSON.stringify({
          platformName: 'Custom Marketplace',
          commissionRate: 15.0,
        }),
      }),
      run: vi.fn(),
    },
  };
});

describe('Master Settings API Route', () => {
  it('GET should return merged settings from database', async () => {
    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Custom values
    expect(data.platformName).toBe('Custom Marketplace');
    expect(data.commissionRate).toBe(15.0);
    // Default values
    expect(data.currency).toBe('USD');
  });

  it('GET should handle already parsed JSON config', async () => {
    ((db as any).get as any).mockResolvedValueOnce({
      config: { platformName: 'Already Parsed' },
    });

    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platformName).toBe('Already Parsed');
  });

  it('GET should return default settings if database throws', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
      throw new Error('Table does not exist');
    });

    const req = new NextRequest('http://localhost/api/master/settings');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platformName).toBe('SinaiCamps Marketplace'); // Default
    expect(data.commissionRate).toBe(10.0); // Default
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
    expect((db as any).run).toHaveBeenCalledWith(
      'marketplace_settings',
      expect.stringContaining('New Name')
    );
  });

  it('POST should handle database errors gracefully', async () => {
    ((db as any).prepare as any).mockImplementationOnce(() => {
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
    expect(data.error).toBe('Database error');
  });
});
