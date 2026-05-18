import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingRouter } from '../src/routes/billing';

describe('Financial Ops Billing Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /folios/:id', () => {
    it('returns 200 with complete folio details if folio exists', async () => {
      const mockFolio = { id: 'folio-123', total_amount: 1500, guest_name: 'John Doe' };
      const mockCharges = [{ id: 'charge-1', amount: 1500, description: 'Room reservation' }];
      const mockPayments = [{ id: 'payment-1', amount: 500, method: 'credit_card' }];

      const mockApi = {
        db: {
          queryOne: vi.fn().mockResolvedValue(mockFolio),
          query: vi.fn().mockResolvedValueOnce(mockCharges).mockResolvedValueOnce(mockPayments),
        },
      };

      const app = billingRouter(mockApi as any);
      const res = await app.request('/folios/folio-123');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toEqual({
        id: 'folio-123',
        total_amount: 1500,
        guest_name: 'John Doe',
        charges: mockCharges,
        payments: mockPayments,
      });

      expect(mockApi.db.queryOne).toHaveBeenCalledWith('SELECT * FROM guest_folios WHERE id = $1', [
        'folio-123',
      ]);
      expect(mockApi.db.query).toHaveBeenCalledWith(
        'SELECT * FROM folio_charges WHERE folio_id = $1',
        ['folio-123']
      );
      expect(mockApi.db.query).toHaveBeenCalledWith('SELECT * FROM payments WHERE folio_id = $1', [
        'folio-123',
      ]);
    });

    it('returns 404 if folio is not found', async () => {
      const mockApi = {
        db: {
          queryOne: vi.fn().mockResolvedValue(null),
        },
      };

      const app = billingRouter(mockApi as any);
      const res = await app.request('/folios/missing-folio');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Folio not found');
    });
  });

  describe('POST /payments', () => {
    it('creates a new payment and updates folio balance', async () => {
      const mockApi = {
        db: {
          execute: vi.fn().mockResolvedValue(undefined),
        },
      };

      const app = billingRouter(mockApi as any);
      const res = await app.request('/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folio_id: 'folio-123',
          amount: 500,
          method: 'credit_card',
        }),
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();

      // Check payment creation statement
      expect(mockApi.db.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO payments'),
        [body.id, 'folio-123', 500, 'credit_card']
      );

      // Check folio balance update statement
      expect(mockApi.db.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE guest_folios'),
        [500, 'folio-123']
      );
    });
  });
});
