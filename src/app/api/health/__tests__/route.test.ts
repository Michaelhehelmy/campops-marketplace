import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  it('should return 200 with ok status', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeDefined();
    expect(data.checks.database.status).toBe('ok');
    expect(data.checks.database.duration).toBeGreaterThanOrEqual(0);
    expect(data.checks.disk).toBeDefined();
    expect(data.checks.plugins.status).toBe('ok');
    expect(data.checks.memory.status).toBe('ok');
    expect(data.checks.memory.message).toContain('MB');
  });
});
