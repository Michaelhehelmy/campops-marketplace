import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
import { db, clearMockStore } from '@/lib/db';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-middleware', () => ({
  requireRole: vi.fn().mockResolvedValue({
    user: { id: 'test-user', role: 'marketplace_master' },
    session: { id: 'test-session' },
  }),
  isErrorResponse: vi.fn().mockReturnValue(false),
}));

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn(),
  },
  clearMockStore: vi.fn(),
}));

describe('GET /api/public/homepage-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should return default config when no config exists in database', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sections).toEqual(['hero', 'featured-listings', 'categories']);
    expect(data.roleBased).toBeDefined();
    expect(data.roleBased.guest).toBeDefined();
    expect(data.roleBased.admin).toBeDefined();
    expect(data.roleBased.master).toBeDefined();
  });

  it('should return config from database when it exists', async () => {
    const mockConfig = {
      sections: ['hero', 'featured-listings', 'categories', 'testimonials'],
      roleBased: {
        guest: { hero: 'personalized-hero' },
        admin: { hero: 'dashboard-link' },
      },
    };

    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue({ config: mockConfig }),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sections).toEqual(['hero', 'featured-listings', 'categories', 'testimonials']);
    expect(data.roleBased).toEqual(mockConfig.roleBased);
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config');
    const res = await GET(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Database connection failed');
  });

  it('should return default config on fetch error', async () => {
    (db.prepare as any).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config');
    const res = await GET(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Unexpected error');
  });
});

describe('PUT /api/public/homepage-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStore();
  });

  it('should update existing configuration', async () => {
    const mockConfig = {
      sections: ['hero', 'featured-listings', 'categories', 'testimonials'],
      roleBased: {
        guest: { hero: 'personalized-hero' },
      },
    };

    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue({ id: 'default' }),
      run: vi.fn().mockResolvedValue(undefined),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify(mockConfig),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.sections).toEqual(mockConfig.sections);
  });

  it('should create new configuration when none exists', async () => {
    const mockConfig = {
      sections: ['hero', 'featured-listings'],
      roleBased: {
        guest: { hero: 'personalized-hero' },
      },
    };

    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue(undefined),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify(mockConfig),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.sections).toEqual(mockConfig.sections);
  });

  it('should reject invalid sections array', async () => {
    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify({ sections: 'invalid' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('sections must be an array');
  });

  it('should handle missing sections', async () => {
    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify({ roleBased: {} }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('sections must be an array');
  });

  it('should handle database errors on update', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue({ id: 'default' }),
      run: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify({ sections: ['hero'] }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Database error');
  });

  it('should handle missing roleBased gracefully', async () => {
    const mockConfig = {
      sections: ['hero', 'featured-listings'],
    };

    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue(undefined),
    });

    const req = new NextRequest('http://localhost/api/public/homepage-config', {
      method: 'PUT',
      body: JSON.stringify(mockConfig),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.sections).toEqual(mockConfig.sections);
    // roleBased is not returned when not provided
    expect(data.roleBased).toBeUndefined();
  });
});
