import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Properties API', () => {
  it('should return properties for a specific owner', async () => {
    const ownerId = uuidv4();
    const propertyId = uuidv4();

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, `owner-${ownerId}@test.com`, 'pass');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active)
      VALUES ($1, $2, $3, $4, 'basic', true)
    `
      )
      .run(propertyId, ownerId, 'Owned Shop', 'owned-shop-' + Math.floor(Math.random() * 1000000));

    // Logic to fetch (simulating API)
    const properties = await db
      .prepare('SELECT * FROM properties WHERE owner_id = $1')
      .all(ownerId);

    expect(properties.length).toBe(1);
    expect(properties[0].id).toBe(propertyId);
  });
});
