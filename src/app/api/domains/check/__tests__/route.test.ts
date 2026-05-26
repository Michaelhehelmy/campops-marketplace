import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET } from '../route';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

describe('GET /api/domains/check', () => {
  beforeEach(async () => {
    await db
      .prepare("DELETE FROM properties WHERE slug LIKE 'domain-check-%'")
      .run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'domain-check-%@test.com'").run();
  });

  it('returns 400 when domain param missing', async () => {
    const req = new NextRequest('http://localhost/api/domains/check');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('domain query parameter is required');
  });

  it('returns available=false when slug already taken', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `domain-check-taken-slug-${Date.now()}`;

    await db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(ownerId, 'domain-check-slug@test.com', 'p');
    await db.prepare(
      'INSERT INTO properties (id, owner_id, name, slug, plan, is_active) VALUES (?, ?, ?, ?, \'basic\', true)'
    ).run(listingId, ownerId, 'Taken Slug Camp', slug);

    const req = new NextRequest(`http://localhost/api/domains/check?domain=${slug}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(data.takenBy).toBe(slug);
  });

  it('returns available=false when subdomain already taken', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `domain-check-sub-${Date.now()}`;

    await db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(ownerId, 'domain-check-subdomain@test.com', 'p');
    await db.prepare(
      'INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain) VALUES (?, ?, ?, ?, \'premium\', true, ?)'
    ).run(listingId, ownerId, 'Premium Camp', slug, slug);

    const req = new NextRequest(`http://localhost/api/domains/check?domain=${slug}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(false);
  });

  it('returns available=false when custom_domain already taken', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `domain-check-cd-${Date.now()}`;
    const domain = `domain-check-test-${Date.now()}.com`;

    await db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(ownerId, 'domain-check-cust@test.com', 'p');
    await db.prepare(
      'INSERT INTO properties (id, owner_id, name, slug, plan, is_active, custom_domain, domain_verified) VALUES (?, ?, ?, ?, \'ultimate\', true, ?, true)'
    ).run(listingId, ownerId, 'Ultimate Camp', slug, domain);

    const req = new NextRequest(`http://localhost/api/domains/check?domain=${domain}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(false);
  });

  it('returns available=true for unused slug', async () => {
    const req = new NextRequest(`http://localhost/api/domains/check?domain=unused-${Date.now()}-slug`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(true);
  });

  it('returns available=true for unused custom domain', async () => {
    const req = new NextRequest(`http://localhost/api/domains/check?domain=unused-${Date.now()}-domain.com`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(true);
  });

  it('returns available=true for unused short slug (3+ chars)', async () => {
    const req = new NextRequest(`http://localhost/api/domains/check?domain=ab${Date.now()}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(true);
  });

  it('returns available=false for reserved slugs (admin, api, manage)', async () => {
    for (const reserved of ['admin', 'api', 'manage', 'www', 'dashboard']) {
      const req = new NextRequest(`http://localhost/api/domains/check?domain=${reserved}`);
      const res = await GET(req);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('reserved');
    }
  });

  it('returns available=false for invalid format (too short, bad chars)', async () => {
    const req = new NextRequest('http://localhost/api/domains/check?domain=ab');
    const res = await GET(req);
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(data.reason).toBe('invalid_format');
  });
});
