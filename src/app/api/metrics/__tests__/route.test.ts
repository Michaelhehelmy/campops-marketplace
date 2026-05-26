import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { httpRequestsTotal, registry, resetMetrics } from '@/lib/metrics';

describe('GET /api/metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should return metrics in prometheus text format', async () => {
    httpRequestsTotal.inc({ method: 'GET', status: '200', path: '/api/test' });

    const req = new Request('http://localhost:3000/api/metrics');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const text = await res.text();

    expect(text).toContain('sinaicamps_http_requests_total');
  });

  it('should return 200 with metrics even when none were recorded', async () => {
    const req = new Request('http://localhost:3000/api/metrics');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(typeof text).toBe('string');
  });

  it('should reject unauthorized requests when METRICS_TOKEN is set', async () => {
    process.env.METRICS_TOKEN = 'secret';
    const req = new Request('http://localhost:3000/api/metrics');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    delete process.env.METRICS_TOKEN;
  });
});
