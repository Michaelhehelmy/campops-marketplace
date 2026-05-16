import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { drizzle } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  drizzle: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      {
        id: 'admin-1',
        name: 'Super Admin',
        email: 'admin@example.com',
        role: 'super_admin',
        createdAt: new Date(),
      },
      {
        id: 'admin-2',
        name: null,
        email: 'disabled@example.com',
        role: 'disabled',
        createdAt: new Date(),
      },
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({}),
  },
}));

describe('Master Admins API Route', () => {
  it('GET should return list of admins', async () => {
    const req = new NextRequest('http://localhost/api/master/admins?adminId=master-admin');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Super Admin');
    expect(data[0].role).toBe('super_admin');
    expect(data[0].status).toBe('active');

    // Check disabled user logic
    expect(data[1].name).toBe('Unknown');
    expect(data[1].role).toBe('support');
    expect(data[1].status).toBe('disabled');
  });

  it('GET should handle database errors gracefully', async () => {
    (drizzle.where as any).mockRejectedValueOnce(new Error('Database error'));

    const req = new NextRequest('http://localhost/api/master/admins?adminId=master-admin');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });

  it('POST should create a new admin', async () => {
    const req = new NextRequest('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Admin',
        email: 'new@example.com',
        role: 'support',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.name).toBe('New Admin');
    expect(data.id).toBeDefined();

    // insert should be called twice (users and user_roles tables)
    expect(drizzle.insert).toHaveBeenCalledTimes(2);
  });

  it('POST should return 400 if required fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Admin',
        // missing email and role
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and role are required');
  });

  it('POST should handle database errors gracefully', async () => {
    (drizzle.insert as any).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const req = new NextRequest('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Admin',
        email: 'new@example.com',
        role: 'support',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
