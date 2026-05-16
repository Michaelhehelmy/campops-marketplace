import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

describe('Marketplace Owner Registration', () => {
  it('should register a new owner and property in master DB', async () => {
    const email = `new-owner-${Date.now()}@test.com`;
    const password = 'password123';
    const property_name = 'Master Camp';
    const slug = 'master-camp-' + Math.floor(Math.random() * 1000000);

    const result = await db.transaction(async (tx) => {
      // 1. Create User
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      await tx
        .prepare('INSERT INTO users (id, email, password, is_verified) VALUES ($1, $2, $3, true)')
        .run(userId, email, hashedPassword);

      // 2. Create Property
      const propertyId = uuidv4();
      await tx
        .prepare(
          `
        INSERT INTO properties (id, owner_id, name, slug, plan, is_active)
        VALUES ($1, $2, $3, $4, 'basic', true)
      `
        )
        .run(propertyId, userId, property_name, slug);

      return { userId, propertyId };
    });

    expect(result.userId).toBeDefined();
    expect(result.propertyId).toBeDefined();

    // Verify DB
    const user = (await db.prepare('SELECT * FROM users WHERE email = $1').get(email)) as any;
    expect(user.id).toBe(result.userId);
  });
});
