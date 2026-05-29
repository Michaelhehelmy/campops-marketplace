import { describe, it, expect } from 'vitest';

describe('GET /api/csrf-token', () => {
  it('returns a CSRF token and sets cookie', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('csrfToken');
    expect(typeof body.csrfToken).toBe('string');
    const cookies = res.cookies?.get('x-csrf-token');
    expect(cookies?.value).toBe(body.csrfToken);
    expect(cookies?.sameSite).toBe('lax');
  });
});
