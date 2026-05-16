import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET } from '../check/route';
import { v4 as uuidv4 } from 'uuid';

describe('Domain Availability API', () => {
  beforeEach(async () => {
    await db
      .prepare("DELETE FROM properties WHERE slug LIKE 'domain-%' OR custom_domain LIKE 'domain-%'")
      .run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'domain-%@test.com'").run();
  });

  it('returns available for a free domain', async () => {
    const req = new NextRequest('http://localhost/api/domains/check?domain=domain-free.localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.domain).toBe('domain-free.localhost');
  });

  it('returns taken for an existing custom domain', async () => {
    const ownerId = uuidv4();
    const propertyId = uuidv4();

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, 'domain-owner@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, custom_domain, domain_verified)
      VALUES ($1, $2, $3, $4, 'ultimate', true, $5, true)
    `
      )
      .run(propertyId, ownerId, 'Domain Shop', 'domain-shop', 'domain-taken.localhost');

    const req = new NextRequest('http://localhost/api/domains/check?domain=domain-taken.localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.takenBy).toBe('domain-shop');
  });
});
