import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';

describe('GET /api/master/stats', () => {
  it('returns 403 if adminId is missing', async () => {
    const req = new Request('http://localhost/api/master/stats');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns stats if adminId is correct', async () => {
    const req = new Request('http://localhost/api/master/stats?adminId=master-admin');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalTenants');
    expect(data).toHaveProperty('activeTenants');
    expect(data).toHaveProperty('systemHealth');
  });
});
