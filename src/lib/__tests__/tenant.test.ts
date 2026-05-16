import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Tenant Resolution', () => {
  let propertyId: string;
  let ownerId: string;

  it('should resolve a valid subdomain', async () => {
    ownerId = uuidv4();
    propertyId = uuidv4();
    const slug = 'test-shop-' + Date.now();
    const subdomain = slug;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, `${subdomain}@test.com`, 'pass');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, subdomain, is_active, plan)
      VALUES ($1, $2, $3, $4, $5, true, 'basic')
    `
      )
      .run(propertyId, ownerId, 'Test Shop', slug, subdomain);

    // Resolution logic (simulating what the API will do)
    const host = `${subdomain}.campops.com`;
    const sub = host.split('.')[0];
    const property = (await db
      .prepare('SELECT id, slug FROM properties WHERE subdomain = $1 AND is_active = true')
      .get(sub)) as any;

    expect(property).not.toBeNull();
    expect(property.id).toBe(propertyId);
    expect(property.slug).toBe(slug);
  });
});
