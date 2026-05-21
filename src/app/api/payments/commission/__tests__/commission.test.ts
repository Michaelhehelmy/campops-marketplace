import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/auth-middleware', () => ({
  requireSession: vi
    .fn()
    .mockResolvedValue({ user: { id: 'test-user' }, session: { id: 'test-session' } }),
  isErrorResponse: vi.fn().mockReturnValue(false),
}));

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
      execute: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Payments Commission API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/payments/commission', () => {
    it('should return 400 if propertyId is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/commission?type=rates');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('propertyId is required');
    });

    it('should return rates when type is rates', async () => {
      const mockRates = [{ id: 'rate-1', rate_percentage: 12.5, is_active: 1 }];

      const prepareMock = vi.mocked(db.prepare);
      const allMock = vi.fn().mockResolvedValue(mockRates);
      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/commission?propertyId=prop-1&type=rates'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.rates).toEqual(mockRates);
      expect(prepareMock).toHaveBeenCalled();
      expect(allMock).toHaveBeenCalledWith('prop-1');
    });

    it('should return transactions and summary for default type', async () => {
      const mockTransactions = [{ id: 'tx-1', amount: 1000, guest_name: 'Guest 1' }];
      const mockSummary = {
        total_revenue_cents: 10000,
        total_commission_cents: 1000,
        total_net_payout_cents: 9000,
        total_transactions: 1,
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 1 }) // countResult
        .mockResolvedValueOnce(mockSummary); // summary
      const allMock = vi.fn().mockResolvedValue(mockTransactions);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/payments/commission?propertyId=prop-1&limit=10&offset=0&status=pending'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.transactions).toEqual(mockTransactions);
      expect(data.summary).toEqual(mockSummary);
      expect(data.pagination.total).toBe(1);
    });

    it('should return 500 on database error', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const req = new NextRequest('http://localhost/api/payments/commission?propertyId=prop-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('POST /api/payments/commission', () => {
    it('should return 400 if bookingId or stripeAccountId is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('bookingId and stripeAccountId are required');
    });

    it('should return 404 if booking is not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Booking not found');
    });

    it('should return 409 if commission already recorded', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ id: 'b-1', property_id: 'prop-1', total_amount_cents: 1000 }) // booking details
          .mockResolvedValueOnce({ id: 'existing-tx' }), // existing recorded check
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe('Commission already recorded for this booking');
      expect(data.transactionId).toBe('existing-tx');
    });

    it('should calculate commission, save transaction, and return 201', async () => {
      const mockBooking = {
        id: 'b-1',
        property_id: 'prop-1',
        total_amount_cents: 10000,
        booking_type: 'cabin',
        currency: 'USD',
      };
      const mockRate = {
        rate_percentage: 12.0,
        flat_fee_cents: 150,
        minimum_commission_cents: 500,
        maximum_commission_cents: 5000,
      };
      const mockTx = {
        id: 'tx-new',
        booking_id: 'b-1',
        commission_amount_cents: 1350, // 10000 * 0.12 = 1200 + 150 = 1350
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockBooking) // 1. fetch booking
        .mockResolvedValueOnce(null) // 2. check existing (none)
        .mockResolvedValueOnce(mockRate) // 3. fetch commission rate (in calculateCommission)
        .mockResolvedValueOnce(mockTx); // 4. fetch inserted transaction
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'tx-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1', platformFeeCents: 50 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.transaction).toEqual(mockTx);
      expect(data.calculation.rate).toBe(12.0);
      expect(data.calculation.commissionCents).toBe(1350);
      expect(data.calculation.netPayoutCents).toBe(8650); // 10000 - 1350 = 8650
    });

    it('should respect minimum constraint in commission calculation', async () => {
      const mockBooking = {
        id: 'b-1',
        property_id: 'prop-1',
        total_amount_cents: 1000, // Very low revenue
        booking_type: 'cabin',
        currency: 'USD',
      };
      const mockRate = {
        rate_percentage: 10.0,
        flat_fee_cents: 0,
        minimum_commission_cents: 500, // Minimum is 500 cents
        maximum_commission_cents: null,
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRate)
        .mockResolvedValueOnce({ id: 'tx-new' });
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'tx-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.calculation.commissionCents).toBe(500); // Bumped to min
      expect(data.calculation.netPayoutCents).toBe(500); // 1000 - 500 = 500
    });

    it('should respect maximum constraint in commission calculation', async () => {
      const mockBooking = {
        id: 'b-1',
        property_id: 'prop-1',
        total_amount_cents: 100000, // High revenue
        booking_type: 'cabin',
        currency: 'USD',
      };
      const mockRate = {
        rate_percentage: 15.0,
        flat_fee_cents: 0,
        minimum_commission_cents: 0,
        maximum_commission_cents: 5000, // Maximum is 5000 cents (50 USD)
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRate)
        .mockResolvedValueOnce({ id: 'tx-new' });
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'tx-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.calculation.commissionCents).toBe(5000); // Capped at max
      expect(data.calculation.netPayoutCents).toBe(95000); // 100000 - 5000 = 95000
    });

    it('should fall back to default rate if no rate configuration is active', async () => {
      const mockBooking = {
        id: 'b-1',
        property_id: 'prop-1',
        total_amount_cents: 10000,
        booking_type: 'cabin',
        currency: 'USD',
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null) // Rate query returns null (fallback triggered)
        .mockResolvedValueOnce({ id: 'tx-new' });
      const runMock = vi.fn().mockResolvedValue({ lastInsertRowid: 'tx-new' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.calculation.rate).toBe(10.0); // Fallback rate
      expect(data.calculation.commissionCents).toBe(1000); // 10000 * 0.10 = 1000
    });

    it('should return 500 on database error during calculate/record', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'b-1', stripeAccountId: 'acct-1' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database insert failed');
    });
  });

  describe('PUT /api/payments/commission', () => {
    it('should return 400 if transactionId or status is missing', async () => {
      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'PUT',
        body: JSON.stringify({ status: 'transferred' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('transactionId and status are required');
    });

    it('should return 404 if transaction is not found', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'PUT',
        body: JSON.stringify({ transactionId: 'tx-1', status: 'transferred' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Transaction not found');
    });

    it('should update status and return 200', async () => {
      const mockTx = {
        id: 'tx-1',
        status: 'transferred',
        stripe_transfer_id: 'tr-123',
        failure_reason: 'low_balance',
      };

      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ id: 'tx-1' }) // transaction exists check
        .mockResolvedValueOnce(mockTx); // transaction query after update
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'PUT',
        body: JSON.stringify({
          transactionId: 'tx-1',
          status: 'transferred',
          stripeTransferId: 'tr-123',
          failureReason: 'low_balance',
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transaction).toEqual(mockTx);
      expect(runMock).toHaveBeenCalled();
    });

    it('should return 500 on database error during update', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const req = new NextRequest('http://localhost/api/payments/commission', {
        method: 'PUT',
        body: JSON.stringify({ transactionId: 'tx-1', status: 'transferred' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database update failed');
    });
  });
});
