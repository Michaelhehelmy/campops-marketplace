import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { drizzle } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  drizzle: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      {
        id: 'staff-1',
        name: 'Staff Member',
        role: 'manager',
        email: 'staff@example.com',
      },
      {
        id: 'staff-2',
        name: null, // Test fallback name
        role: 'staff',
        email: 'staff2@example.com',
      },
    ]),
  },
}));

describe('Manage Staff API Route', () => {
  it('should return staff members for a property', async () => {
    const req = new NextRequest('http://localhost/api/manage/prop-1/staff');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Staff Member');
    expect(data[0].role).toBe('manager');
    expect(data[0].status).toBe('on_duty'); // Check mock value
    expect(data[1].name).toBe('Unknown Staff'); // Check fallback
  });

  it('should handle database errors gracefully', async () => {
    (drizzle.where as any).mockRejectedValueOnce(new Error('Database error'));

    const req = new NextRequest('http://localhost/api/manage/prop-1/staff');
    const response = await GET(req, { params: { listingId: 'prop-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
  });
});
