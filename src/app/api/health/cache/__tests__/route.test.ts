import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({
  cacheHealthCheck: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('GET /api/health/cache', () => {
  it('returns cache health', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
