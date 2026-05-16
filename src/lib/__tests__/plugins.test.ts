import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Plugin Registry API', () => {
  it('should return active plugins for a property', async () => {
    const propertyId = uuidv4();
    const ownerId = uuidv4();

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, `plugins-${propertyId}@test.com`, 'pass');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active)
      VALUES ($1, $2, $3, $4, 'basic', true)
    `
      )
      .run(
        propertyId,
        ownerId,
        'Plugin Shop',
        'plugin-shop-' + Math.floor(Math.random() * 1000000)
      );

    await db
      .prepare(
        `
      INSERT INTO property_plugins (property_id, plugin_name, is_enabled)
      VALUES ($1, $2, true)
    `
      )
      .run(propertyId, 'loyalty-program');

    const plugins = await db
      .prepare(
        'SELECT plugin_name FROM property_plugins WHERE property_id = $1 AND is_enabled = true'
      )
      .all(propertyId);

    expect(plugins.length).toBe(1);
    expect(plugins[0].plugin_name).toBe('loyalty-program');
  });
});
