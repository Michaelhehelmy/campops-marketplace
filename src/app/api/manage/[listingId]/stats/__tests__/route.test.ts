import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';

describe('GET /api/manage/[listingId]/stats', () => {
  it('returns stats for a given listingId', async () => {
    const req = new Request('http://localhost/api/manage/test-listing/stats');
    const res = await GET(req, { params: { listingId: 'test-listing' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('tenantId');
    expect(data).toHaveProperty('enabledPlugins');
  });
});
