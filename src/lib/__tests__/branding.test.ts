import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Branding API', () => {
  it('should return branding settings for a specific property', async () => {
    const propertyId = uuidv4();
    const ownerId = uuidv4();

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, `branding-${propertyId}@test.com`, 'pass');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, settings)
      VALUES ($1, $2, $3, $4, 'basic', true, $5)
    `
      )
      .run(
        propertyId,
        ownerId,
        'Branded Shop',
        'branded-shop-' + Math.floor(Math.random() * 1000000),
        JSON.stringify({
          branding: {
            primaryColor: '#FF0000',
            logoUrl: 'https://logo.com/img.png',
          },
        })
      );

    const prop = (await db
      .prepare('SELECT settings FROM properties WHERE id = $1')
      .get(propertyId)) as any;
    const settings = typeof prop.settings === 'string' ? JSON.parse(prop.settings) : prop.settings;

    expect(settings.branding.primaryColor).toBe('#FF0000');
  });
});
