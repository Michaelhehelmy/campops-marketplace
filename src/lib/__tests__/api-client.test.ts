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

  it('handles absolute HTTP URLs in apiFetch', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ success: true }),
    });

    vi.resetModules();
    // Set absolute URL base in env to test path starting with http
    const originalEnvUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.com';

    const { getCurrencies } = await import('../api');
    await getCurrencies();

    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toBe('https://custom-api.com/api/public/currencies');

    process.env.NEXT_PUBLIC_API_URL = originalEnvUrl;
    vi.resetModules();
  });

  it('calls correct URL and query parameters for getProperty', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ property: {} }),
    });

    const { getProperty } = await import('../api');
    await getProperty('safari-camp', '2025-06-01', '2025-06-05', 'USD');

    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/api/public/properties/safari-camp');
    expect(url).toContain('checkIn=2025-06-01');
    expect(url).toContain('checkOut=2025-06-05');
    expect(url).toContain('currency=USD');
  });

  it('calls correct URL and method for createBooking', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ booking: { id: 'r-123' } }),
    });

    const { createBooking } = await import('../api');
    const payload = {
      propertyId: 'prop-1',
      roomTypeId: 'rt-1',
      checkIn: '2025-06-01',
      checkOut: '2025-06-05',
      guestName: 'Jane Doe',
      guestEmail: 'jane@example.com',
      adults: 2,
    };

    const result = await createBooking(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/p/booking/book'),
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.reservationId).toBe('r-123');
  });

  it('calls correct URL for getBooking', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ booking: { id: 'b-999' } }),
    });

    const { getBooking } = await import('../api');
    const result = await getBooking('b-999');

    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/api/public/bookings/b-999');
    expect(result.booking.id).toBe('b-999');
  });

  it('calls correct URL and query parameters for getTenantListing', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ property: {} }),
    });

    const { getTenantListing } = await import('../api');
    await getTenantListing('tenant-100', '2025-08-01', '2025-08-05', 'EUR');

    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/api/public/tenant-listing');
    expect(url).toContain('tenantId=tenant-100');
    expect(url).toContain('checkIn=2025-08-01');
    expect(url).toContain('checkOut=2025-08-05');
    expect(url).toContain('currency=EUR');
  });
});
