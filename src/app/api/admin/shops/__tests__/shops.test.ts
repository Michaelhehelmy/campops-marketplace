import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
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

  const transactionMock = vi.fn().mockImplementation((callback) => {
    return callback({ prepare: prepareMock, get: getMock, all: allMock, run: runMock });
  });

  return {
    db: {
      prepare: prepareMock,
      get: getMock,
      all: allMock,
      run: runMock,
      transaction: transactionMock,
    },
    drizzle: {} as any,
  };
});

describe('Admin Shops API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/shops', () => {
    it('should return shops list with pagination', async () => {
      const mockShops = [{ id: 'shop-1', name: 'Safari Camp', is_active: 1 }];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 1 }); // count query
      const allMock = vi.fn().mockResolvedValue(mockShops); // query list

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/shops');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shops).toEqual(mockShops);
      expect(data.pagination.total).toBe(1);
    });

    it('should list all shops with search, status, and pagination filters', async () => {
      const mockShops = [{ id: 'shop-1', name: 'Safari Camp', is_active: 1 }];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 1 }); // count query
      const allMock = vi.fn().mockResolvedValue(mockShops); // query list

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?status=active&search=safari&limit=10&offset=0'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shops).toEqual(mockShops);
      expect(data.pagination.total).toBe(1);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('should support inactive status filter in shops list', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?status=inactive'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shops).toEqual([]);
    });

    it('should return empty shops list for search with no matches', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?search=nonexistent'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shops).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should set hasMore to true when there are more results than the limit', async () => {
      const mockShops = [{ id: 'shop-1', name: 'Safari Camp', is_active: 1 }];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ total: 2 });
      const allMock = vi.fn().mockResolvedValue(mockShops);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?limit=1&offset=0'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('should return 500 on database error during GET', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database list failed');
      });

      const req = new NextRequest('http://localhost/api/admin/shops');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database list failed');
    });
  });

  describe('PUT /api/admin/shops', () => {
    it('should return 400 if shopIds or action is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: ['shop-1'] }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for PUT with empty request body', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should handle empty shopIds array without errors', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 0 });

      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: [], action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('0 shops activated');
      expect(runMock).not.toHaveBeenCalled();
    });

    it('should return 400 if shopIds is not an array', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: 'not-an-array', action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 400 if action is invalid', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: ['shop-1'], action: 'invalid-action' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid action. Use 'activate' or 'deactivate'");
    });

    it('should successfully bulk activate shops', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({
          shopIds: ['shop-1', 'shop-2'],
          action: 'activate',
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('2 shops activated');
      expect(data.affectedIds).toEqual(['shop-1', 'shop-2']);
      expect(runMock).toHaveBeenCalledTimes(2);
    });

    it('should successfully bulk deactivate shops', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });

      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: ['shop-1'], action: 'deactivate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('1 shops deactivated');
      expect(data.affectedIds).toEqual(['shop-1']);
      expect(runMock).toHaveBeenCalledTimes(1);
    });

    it('should return 500 on database error during PUT', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: ['shop-1'], action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Transaction failed');
    });
  });
});
