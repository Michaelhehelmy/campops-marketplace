import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { incrementCounter, resetMetrics } from '@/lib/metrics';

describe('GET /api/metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should return metrics object with counter data', async () => {
    incrementCounter('requests_total');
    incrementCounter('bookings_created');
    incrementCounter('auth_failures');

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveProperty('counter_requests_total');
    expect(data.counter_requests_total).toBeGreaterThanOrEqual(1);
    expect(data.counter_bookings_created).toBeGreaterThanOrEqual(1);
    expect(data.counter_auth_failures).toBeGreaterThanOrEqual(1);
  });

  it('should return 200 with counters even when no metrics were recorded', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
  });
});
