/**
 * Tests for src/lib/api.ts — the typed API client utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('apiFetch utility (via searchProperties)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls correct URL for property search', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify({
          properties: [{ id: 'p1', name: 'Camp A' }],
          totalCount: 1,
        }),
    });

    const { searchProperties } = await import('../api');
    const result = await searchProperties({
      checkIn: '2025-01-01',
      checkOut: '2025-01-05',
      adults: 2,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/public'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
    expect(result.properties).toHaveLength(1);
  });

  it('throws on invalid JSON response', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => 'NOT JSON',
    });

    const { searchProperties } = await import('../api');
    await expect(
      searchProperties({ checkIn: '2025-01-01', checkOut: '2025-01-05', adults: 2 })
    ).rejects.toThrow('Invalid JSON');
  });

  it('passes destination param in query string', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ properties: [], totalCount: 0 }),
    });

    const { searchProperties } = await import('../api');
    await searchProperties({
      checkIn: '2025-01-01',
      checkOut: '2025-01-05',
      adults: 2,
      destination: 'Nairobi',
    });
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('destination=Nairobi');
  });

  it('passes checkIn and checkOut params', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ properties: [], totalCount: 0 }),
    });

    const { searchProperties } = await import('../api');
    await searchProperties({ checkIn: '2025-01-01', checkOut: '2025-01-05', adults: 2 });
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('checkIn=2025-01-01');
    expect(url).toContain('checkOut=2025-01-05');
  });
});

describe('featureFlags.checkFlag', () => {
  it('returns false when flag does not exist', async () => {
    const { checkFlag } = await import('../featureFlags');
    const result = await checkFlag('nonexistent_flag_xyz');
    expect(result).toBe(false);
  });

  it('returns false on DB error', async () => {
    vi.doMock('../db', () => ({
      db: {
        prepare: vi.fn().mockImplementation(() => {
          throw new Error('DB down');
        }),
      },
    }));
    vi.resetModules();
    const { checkFlag } = await import('../featureFlags');
    const result = await checkFlag('some_flag');
    expect(result).toBe(false);
    vi.doUnmock('../db');
  });
});
