import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Admin API', () => {
  const createAdminUser = async (email: string, role: string = 'marketplace_master') => {
    const userId = uuidv4();
    await db
      .prepare(
        `
      INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
    `
      )
      .run(userId, email, 'hashed_password');

    await db
      .prepare(
        `
      INSERT INTO user_roles (user_id, role, permissions) 
      VALUES ($1, $2, $3)
    `
      )
      .run(userId, role, JSON.stringify(['admin_access', 'manage_shops', 'override_listings']));

    return userId;
  };

  const createShop = async (ownerId: string, name: string, isActive: boolean = true) => {
    const propertyId = uuidv4();
    const slug = `shop-${Math.floor(Math.random() * 1000000)}`;

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain)
      VALUES ($1, $2, $3, $4, 'basic', $5, $6)
    `
      )
      .run(propertyId, ownerId, name, slug, isActive, slug);

    return propertyId;
  };

  beforeEach(async () => {
    // Clean up test data before each test - order matters for FK constraints
    await db.prepare("DELETE FROM property_plugins WHERE plugin_name LIKE 'test-%'").run();
    await db
      .prepare(
        "DELETE FROM property_staff WHERE property_id IN (SELECT id FROM properties WHERE slug LIKE 'shop-%' OR slug LIKE 'test-%')"
      )
      .run();
    await db.prepare("DELETE FROM properties WHERE slug LIKE 'shop-%' OR slug LIKE 'test-%'").run();
    await db
      .prepare(
        "DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%' OR email LIKE '%@marketplace.com')"
      )
      .run();
    await db
      .prepare("DELETE FROM users WHERE email LIKE 'test-%' OR email LIKE '%@marketplace.com'")
      .run();
  });

  describe('GET /api/admin/shops', () => {
    it('should list all shops with owner details', async () => {
      const adminId = await createAdminUser('test-admin@marketplace.com');
      const ownerId = uuidv4();

      await db
        .prepare(
          `
        INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
      `
        )
        .run(ownerId, 'test-owner@example.com', 'pass');

      const propertyId1 = await createShop(ownerId, 'Safari Camp');
      const propertyId2 = await createShop(ownerId, 'Beach Resort');

      // Simulate admin fetching all shops
      const shops = await db
        .prepare(
          `
        SELECT p.*, u.email as owner_email, u.id as owner_id
        FROM properties p
        JOIN users u ON u.id = p.owner_id
        ORDER BY p.created_at DESC
      `
        )
        .all();

      expect(shops.length).toBeGreaterThanOrEqual(2);
      expect(shops.some((s) => s.name === 'Safari Camp')).toBe(true);
      expect(shops.some((s) => s.name === 'Beach Resort')).toBe(true);
    });

    it('should filter shops by active status', async () => {
      const ownerId = uuidv4();

      await db
        .prepare(
          `
        INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
      `
        )
        .run(ownerId, 'test-owner2@example.com', 'pass');

      await createShop(ownerId, 'Active Shop', true);
      await createShop(ownerId, 'Inactive Shop', false);

      const activeShops = await db
        .prepare(
          `
        SELECT * FROM properties WHERE is_active = true
      `
        )
        .all();

      const inactiveShops = await db
        .prepare(
          `
        SELECT * FROM properties WHERE is_active = false
      `
        )
        .all();

      expect(activeShops.some((s) => s.name === 'Active Shop')).toBe(true);
      expect(inactiveShops.some((s) => s.name === 'Inactive Shop')).toBe(true);
    });
  });

  describe('POST /api/admin/shops/:id/deactivate', () => {
    it('should deactivate a shop', async () => {
      const ownerId = uuidv4();

      await db
        .prepare(
          `
        INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
      `
        )
        .run(ownerId, 'test-owner3@example.com', 'pass');

      const propertyId = await createShop(ownerId, 'Shop to Deactivate', true);

      // Verify shop is initially active
      let shop = await db.prepare('SELECT * FROM properties WHERE id = $1').get(propertyId);
      expect(shop.isActive).toBe(true);

      // Deactivate the shop
      await db.prepare('UPDATE properties SET is_active = 0 WHERE id = $1').run(propertyId);

      // Verify shop is deactivated
      shop = await db.prepare('SELECT * FROM properties WHERE id = $1').get(propertyId);
      expect(shop.isActive).toBe(false);
    });
  });

  describe('PUT /api/admin/shops/:id/override', () => {
    it('should override listing data for a shop', async () => {
      const ownerId = uuidv4();

      await db
        .prepare(
          `
        INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
      `
        )
        .run(ownerId, 'test-owner4@example.com', 'pass');

      const propertyId = await createShop(ownerId, 'Original Name', true);

      // Override shop data
      await db
        .prepare(
          `
        UPDATE properties 
        SET name = $1, description = $2, settings = $3
        WHERE id = $4
      `
        )
        .run(
          'Overridden Name',
          'Admin overridden description',
          JSON.stringify({ admin_override: true, featured: true }),
          propertyId
        );

      const shop = await db.prepare('SELECT * FROM properties WHERE id = $1').get(propertyId);
      expect(shop.name).toBe('Overridden Name');
      expect(shop.description).toBe('Admin overridden description');
      expect(shop.settings.admin_override).toBe(true);
      expect(shop.settings.featured).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should verify marketplace_master role for admin access', async () => {
      const adminId = await createAdminUser('test-master@marketplace.com', 'marketplace_master');

      const roles = await db
        .prepare(
          `
        SELECT role, permissions FROM user_roles WHERE user_id = $1
      `
        )
        .all(adminId);

      expect(roles.length).toBe(1);
      expect(roles[0].role).toBe('marketplace_master');
      expect(roles[0].permissions).toContain('admin_access');
      expect(roles[0].permissions).toContain('manage_shops');
    });

    it('should reject non-admin users from admin operations', async () => {
      const regularUserId = await createAdminUser('test-regular@example.com', 'property_owner');

      const roles = await db
        .prepare(
          `
        SELECT role FROM user_roles WHERE user_id = $1
      `
        )
        .all(regularUserId);

      expect(roles[0].role).not.toBe('marketplace_master');
    });
  });
});
