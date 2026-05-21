import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth-middleware', () => ({
  requireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-user', role: 'marketplace_master' },
    session: { id: 'test-session' },
  }),
  isErrorResponse: vi.fn().mockReturnValue(false),
}));

import { GET } from '../route';

describe('GET /api/master/stats', () => {
  it('returns stats from the database', async () => {
    const req = new Request('http://localhost/api/master/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalTenants');
    expect(data).toHaveProperty('activeTenants');
    expect(data).toHaveProperty('systemHealth');
  });
});
