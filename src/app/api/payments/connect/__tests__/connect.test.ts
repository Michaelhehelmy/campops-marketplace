import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => {
  const getMock = vi.fn();
  const allMock = vi.fn();
  const runMock = vi.fn();

  const prepareMock = vi.fn().mockImplementation(() => ({
    get: getMock,
    all: allMock,
    run: runMock,
  }));

  return {
    db: {
      prepare: prepareMock,
      get: getMock,
      all: allMock,
      run: runMock,
    },
  };
});

describe('Payments Connect API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/payments/connect', () => {
    it('should return 400 if propertyId or userId is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/connect?propertyId=prop-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('propertyId and userId are required');
    });

    it('should return 403 if user has no access to property', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(null) // owner check returns null
        .mockResolvedValueOnce(null); // staff check returns null

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/connect?propertyId=prop-1&userId=user-1'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return Stripe account if user is owner', async () => {
      const mockAccount = { stripe_account_id: 'acct-123', onboarding_complete: 1 };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ owner_id: 'user-1' }) // owner match
        .mockResolvedValueOnce(mockAccount); // account details

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/connect?propertyId=prop-1&userId=user-1'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.account).toEqual(mockAccount);
    });

    it('should return Stripe account if user is staff', async () => {
      const mockAccount = { stripe_account_id: 'acct-123', onboarding_complete: 1 };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ owner_id: 'user-owner' }) // not owner
        .mockResolvedValueOnce({ user_id: 'user-1' }) // has staff access
        .mockResolvedValueOnce(mockAccount); // account details

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/connect?propertyId=prop-1&userId=user-1'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.account).toEqual(mockAccount);
    });

    it('should return message if no account is found for property', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ owner_id: 'user-1' }) // owner
        .mockResolvedValueOnce(null); // no account

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/connect?propertyId=prop-1&userId=user-1'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.account).toBeNull();
      expect(data.message).toBe('No Stripe Connect account found for this property');
    });

    it('should return 500 on database error during GET', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database select failed');
      });

      const req = new NextRequest(
        'http://localhost/api/payments/connect?propertyId=prop-1&userId=user-1'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database select failed');
    });
  });

  describe('POST /api/payments/connect', () => {
    it('should return 400 if userId, propertyId, or stripeAccountId is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('userId, propertyId, and stripeAccountId are required');
    });

    it('should return 404 if property not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-1', propertyId: 'prop-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Property not found');
    });

    it('should return 403 if user is not the owner', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue({ owner_id: 'owner-user' }),
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'other-user',
          propertyId: 'prop-1',
          stripeAccountId: 'acct-1',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Only property owner can setup Stripe Connect');
    });

    it('should create new connect account when not existing', async () => {
      const mockAccount = { id: 'acct-db-1', stripe_account_id: 'acct-123' };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ owner_id: 'user-owner' }) // owner match
        .mockResolvedValueOnce(null) // no existing account
        .mockResolvedValueOnce(mockAccount); // query after insert
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-owner',
          propertyId: 'prop-1',
          stripeAccountId: 'acct-123',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.account).toEqual(mockAccount);
      expect(runMock).toHaveBeenCalled();
    });

    it('should update existing connect account when already linked', async () => {
      const mockAccount = { id: 'acct-db-1', stripe_account_id: 'acct-123-new' };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ owner_id: 'user-owner' }) // owner match
        .mockResolvedValueOnce({ id: 'existing-record' }) // already exists
        .mockResolvedValueOnce(mockAccount); // query after update
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-owner',
          propertyId: 'prop-1',
          stripeAccountId: 'acct-123-new',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.account).toEqual(mockAccount);
      expect(runMock).toHaveBeenCalled();
    });

    it('should return 500 on database error during POST', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-owner',
          propertyId: 'prop-1',
          stripeAccountId: 'acct-123',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database insert failed');
    });
  });

  describe('PUT /api/payments/connect', () => {
    it('should return 400 if stripeAccountId is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'PUT',
        body: JSON.stringify({ chargesEnabled: true }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('stripeAccountId is required');
    });

    it('should return 404 if stripe account not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi.fn().mockResolvedValue(null);

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'PUT',
        body: JSON.stringify({ stripeAccountId: 'acct-123' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Account not found');
    });

    it('should update account status and return 200', async () => {
      const mockAccount = { stripe_account_id: 'acct-123', charges_enabled: 1, payouts_enabled: 1 };
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi.fn().mockResolvedValue(mockAccount);

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'PUT',
        body: JSON.stringify({
          stripeAccountId: 'acct-123',
          chargesEnabled: true,
          payoutsEnabled: true,
          requirementsDue: ['payouts.bank_account'],
          onboardingComplete: true,
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.account).toEqual(mockAccount);
    });

    it('should return 500 on database error during PUT', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const req = new NextRequest('http://localhost/api/payments/connect', {
        method: 'PUT',
        body: JSON.stringify({ stripeAccountId: 'acct-123' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database update failed');
    });
  });
});
