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
  };
});

describe('Admin Shops API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/shops', () => {
    it('should return 400 if adminId is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('adminId is required');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // not admin
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/shops?adminId=user-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized: marketplace_master role required');
    });

    it('should always authorize "master-admin" when DATABASE_URL is missing', async () => {
      const mockShops = [{ id: 'shop-1', name: 'Luxury Camp' }];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi.fn().mockResolvedValueOnce({ total: 1 });
      const allMock = vi.fn().mockResolvedValue(mockShops);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      // Temporarily clear DATABASE_URL
      const oldUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const req = new NextRequest('http://localhost/api/admin/shops?adminId=master-admin');
      const res = await GET(req);
      const data = await res.json();

      // Restore DATABASE_URL
      process.env.DATABASE_URL = oldUrl;

      expect(res.status).toBe(200);
      expect(data.shops).toEqual(mockShops);
    });

    it('should list all shops with search, status, and pagination filters', async () => {
      const mockShops = [{ id: 'shop-1', name: 'Safari Camp', is_active: 1 }];
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi
        .fn()
        .mockResolvedValueOnce({ role: 'marketplace_master' }) // verifyAdminAccess
        .mockResolvedValueOnce({ total: 1 }); // count query
      const allMock = vi.fn().mockResolvedValue(mockShops); // query list

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?adminId=admin-1&status=active&search=safari&limit=10&offset=0'
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
        .mockResolvedValueOnce({ role: 'marketplace_master' })
        .mockResolvedValueOnce({ total: 0 });
      const allMock = vi.fn().mockResolvedValue([]);

      prepareMock.mockReturnValue({
        get: getMock,
        all: allMock,
        run: vi.fn(),
      });

      const req = new NextRequest(
        'http://localhost/api/admin/shops?adminId=admin-1&status=inactive'
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shops).toEqual([]);
    });

    it('should return 500 on database error during GET', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockImplementation(() => {
        throw new Error('Database list failed');
      });

      const req = new NextRequest('http://localhost/api/admin/shops?adminId=admin-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Database list failed');
    });
  });

  describe('PUT /api/admin/shops', () => {
    it('should return 400 if adminId, shopIds, or action is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ shopIds: ['shop-1'] }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('adminId, shopIds array, and action are required');
    });

    it('should return 400 if shopIds is not an array', async () => {
      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'admin-1', shopIds: 'not-an-array', action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('adminId, shopIds array, and action are required');
    });

    it('should return 403 if user is not marketplace_master', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue(null), // verifyAdminAccess fails
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'user-1', shopIds: ['shop-1'], action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if action is invalid', async () => {
      const prepareMock = vi.mocked(db.prepare);
      prepareMock.mockReturnValue({
        get: vi.fn().mockResolvedValue({ role: 'marketplace_master' }), // authorized
        all: vi.fn(),
        run: vi.fn(),
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'admin-1', shopIds: ['shop-1'], action: 'invalid-action' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid action. Use 'activate' or 'deactivate'");
    });

    it('should successfully bulk activate shops', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const runMock = vi.fn().mockResolvedValue({ changes: 1 });
      const getMock = vi.fn().mockResolvedValueOnce({ role: 'marketplace_master' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({
          adminId: 'admin-1',
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
      const getMock = vi.fn().mockResolvedValueOnce({ role: 'marketplace_master' });

      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: runMock,
      });

      const req = new NextRequest('http://localhost/api/admin/shops', {
        method: 'PUT',
        body: JSON.stringify({ adminId: 'admin-1', shopIds: ['shop-1'], action: 'deactivate' }),
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
        body: JSON.stringify({ adminId: 'admin-1', shopIds: ['shop-1'], action: 'activate' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Transaction failed');
    });
  });
});
