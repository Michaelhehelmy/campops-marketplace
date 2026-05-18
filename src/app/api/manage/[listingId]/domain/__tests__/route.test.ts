import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { POST } from '../route';
import { GET as resolveTenant } from '@/app/api/tenant/resolve/route';
import { v4 as uuidv4 } from 'uuid';

describe('Manage Domain API', () => {
  beforeEach(async () => {
    await db.prepare("DELETE FROM properties WHERE slug LIKE 'manage-domain-%'").run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'manage-domain-%@test.com'").run();
  });

  it('attaches a custom domain and upgrades the listing to ultimate', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `manage-domain-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')
      .run(ownerId, 'manage-domain-owner@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active)
      VALUES (?, ?, ?, ?, 'premium', true)
    `
      )
      .run(listingId, ownerId, 'Manage Domain Shop', slug);

    const req = new NextRequest(`http://localhost/api/manage/${listingId}/domain`, {
      method: 'POST',
      body: JSON.stringify({ domain: 'manage-domain.localhost' }),
    });

    const res = await POST(req, { params: { listingId } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.domain).toBe('manage-domain.localhost');

    const resolveReq = new NextRequest(
      'http://localhost/api/tenant/resolve?host=manage-domain.localhost'
    );
    const resolveRes = await resolveTenant(resolveReq);
    const resolveData = await resolveRes.json();

    expect(resolveRes.status).toBe(200);
    expect(resolveData.property.id).toBe(listingId);
    expect(resolveData.property.slug).toBe(slug);
  });
});
