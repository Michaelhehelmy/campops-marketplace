import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET } from '../route';
import { v4 as uuidv4 } from 'uuid';

const originalBaseDomain = process.env.BASE_DOMAIN;

describe('Tenant Resolve API', () => {
  beforeEach(async () => {
    process.env.BASE_DOMAIN = 'sinaicamps.localhost';
    await db
      .prepare(
        "DELETE FROM properties WHERE slug LIKE 'tenant-resolve-%' OR custom_domain LIKE 'tenant-resolve-%'"
      )
      .run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'tenant-resolve-%@test.com'").run();
  });

  it('resolves a subdomain listing', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `tenant-resolve-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')
      .run(ownerId, 'tenant-resolve-owner@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain)
      VALUES (?, ?, ?, ?, 'subdomain', true, ?)
    `
      )
      .run(listingId, ownerId, 'Tenant Resolve Shop', slug, slug);

    const req = new NextRequest(
      `http://localhost/api/tenant/resolve?host=${slug}.sinaicamps.localhost`
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.property.id).toBe(listingId);
    expect(data.property.slug).toBe(slug);
  });

  it('resolves a verified custom domain listing', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `tenant-resolve-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')
      .run(ownerId, 'tenant-resolve-owner-2@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, custom_domain, domain_verified)
      VALUES (?, ?, ?, ?, 'ultimate', true, ?, true)
    `
      )
      .run(listingId, ownerId, 'Custom Domain Shop', slug, 'custom-resolve.localhost');

    const req = new NextRequest(
      'http://localhost/api/tenant/resolve?host=custom-resolve.localhost'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.property.id).toBe(listingId);
    expect(data.property.slug).toBe(slug);
  });

  it('returns 404 for an unverified custom domain', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `tenant-resolve-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')
      .run(ownerId, 'tenant-resolve-owner-3@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, custom_domain, domain_verified)
      VALUES (?, ?, ?, ?, 'ultimate', true, ?, false)
    `
      )
      .run(listingId, ownerId, 'Pending Domain Shop', slug, 'pending-resolve.localhost');

    const req = new NextRequest(
      'http://localhost/api/tenant/resolve?host=pending-resolve.localhost'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Domain not yet verified');
  });

  it('returns 400 when host param is missing', async () => {
    const req = new NextRequest('http://localhost/api/tenant/resolve');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/host.*required/i);
  });

  it('returns 404 for basic plan on subdomain', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `tenant-resolve-basic-${Date.now()}`;

    await db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(ownerId, 'tenant-resolve-basic@test.com', 'password');
    await db.prepare(
      'INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain) VALUES (?, ?, ?, ?, \'basic\', true, ?)'
    ).run(listingId, ownerId, 'Basic Plan Camp', slug, slug);

    const req = new NextRequest(`http://localhost/api/tenant/resolve?host=${slug}.sinaicamps.localhost`);
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-ultimate plan on custom domain', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `tenant-resolve-premium-cd-${Date.now()}`;

    await db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(ownerId, 'tenant-resolve-premium-cd@test.com', 'password');
    await db.prepare(
      'INSERT INTO properties (id, owner_id, name, slug, plan, is_active, custom_domain, domain_verified) VALUES (?, ?, ?, ?, \'premium\', true, ?, true)'
    ).run(listingId, ownerId, 'Premium Custom Domain', slug, 'premium-custom.localhost');

    const req = new NextRequest('http://localhost/api/tenant/resolve?host=premium-custom.localhost');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toMatch(/ultimate/i);
  });

  it('does NOT apply 127.0.0.1 bypass when NODE_ENV=production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const req = new NextRequest('http://localhost/api/tenant/resolve?host=127.0.0.1');
      const res = await GET(req);
      expect(res.status).toBe(404);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

afterAll(() => {
  process.env.BASE_DOMAIN = originalBaseDomain;
});
