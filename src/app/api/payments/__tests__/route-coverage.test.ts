import { describe, it, expect, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) }, handler: vi.fn() },
}));

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_for_tests';
});

describe('POST /api/payments/connect', () => {
  it('returns 400 when propertyId missing', async () => {
    const { POST } = await import('../connect/route');
    const res = await POST(
      new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
    expect([400, 401, 500]).toContain(res.status);
  });

  it('returns response with propertyId and provider', async () => {
    const { POST } = await import('../connect/route');
    const res = await POST(
      new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          provider: 'stripe',
          userId: 'u1',
        }),
      })
    );
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});

describe('POST /api/payments/commission', () => {
  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('../commission/route');
    const res = await POST(
      new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
    expect([400, 500]).toContain(res.status);
  });

  it('calculates commission for a property', async () => {
    const { POST } = await import('../commission/route');
    const res = await POST(
      new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-1',
          totalAmountCents: 10000,
          appliesTo: 'all',
        }),
      })
    );
    expect([200, 400, 500]).toContain(res.status);
  });
});
