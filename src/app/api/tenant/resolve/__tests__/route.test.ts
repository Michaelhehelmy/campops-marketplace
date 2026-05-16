import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET } from '../route';
import { v4 as uuidv4 } from 'uuid';

const originalBaseDomain = process.env.BASE_DOMAIN;

describe('Tenant Resolve API', () => {
  beforeEach(async () => {
    process.env.BASE_DOMAIN = 'campops.localhost';
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
      `http://localhost/api/tenant/resolve?host=${slug}.campops.localhost`
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
});

afterAll(() => {
  process.env.BASE_DOMAIN = originalBaseDomain;
});
