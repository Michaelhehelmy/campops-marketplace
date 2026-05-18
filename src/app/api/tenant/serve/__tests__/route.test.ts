import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

describe('Tenant Serving API Route', () => {
  beforeEach(() => {
    db.resetMockStore();

    // Seed Acacia Camp as an Ultimate Tier tenant in the in-memory test DB
    db.prepare(
      `
      INSERT OR REPLACE INTO properties (id, slug, name, city, owner_id, is_active, domain_verified, plan, custom_domain, settings)
      VALUES ('3', 'acacia', 'Acacia Camp', 'Dahab', 'admin-acacia', 1, 1, 'ultimate', 'acaciacamp.com', ?)
    `
    ).run(JSON.stringify({ customDomain: 'acaciacamp.com', customDomainVerified: true }));
  });

  it('returns 400 when host parameter is missing', async () => {
    const req = new NextRequest('http://localhost/api/tenant/serve?path=/');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('host query parameter');
  });

  it('returns 404 when tenant is not found', async () => {
    const req = new NextRequest('http://localhost/api/tenant/serve?host=nonexistent.com&path=/');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Tenant not found');
  });

  it('serves index.html with injected tenant property ID for root request', async () => {
    const req = new NextRequest('http://localhost/api/tenant/serve?host=acaciacamp.com&path=/');
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(text).toContain(
      '<meta id="x-tenant-property-id" name="x-tenant-property-id" content="3" />'
    );
  });

  it('serves index.html with injected tenant property ID for client-side page routes (fallback)', async () => {
    const req = new NextRequest(
      'http://localhost/api/tenant/serve?host=acaciacamp.com&path=/en/manage/3'
    );
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(text).toContain(
      '<meta id="x-tenant-property-id" name="x-tenant-property-id" content="3" />'
    );
  });

  it('serves pre-compiled static javascript assets with correct content-type', async () => {
    const req = new NextRequest(
      'http://localhost/api/tenant/serve?host=acaciacamp.com&path=/assets/index-GFB96b6Q.js'
    );
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/javascript');
    expect(text).toContain('react'); // Should contain compiled react code
  });

  it('returns 404 for non-existent asset files with file extensions', async () => {
    const req = new NextRequest(
      'http://localhost/api/tenant/serve?host=acaciacamp.com&path=/assets/missing-file.png'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('File not found');
  });
});
