import { describe, it, expect, vi } from 'vitest';
import * as schema from '../schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

describe('Database Schema', () => {
  it('should export all expected core tables', () => {
    const coreTableNames = [
      'users',
      'sessions',
      'accounts',
      'verifications',
      'userRoles',
      'availablePlugins',
      'profiles',
      // Generic multi-tenant tables (formerly "property*")
      'tenants',
      'tenantStaff',
      'tenantPlugins',
      // Backward-compat aliases — must still exist
      'properties',
      'propertyStaff',
      'propertyPlugins',
    ];

    coreTableNames.forEach((name) => {
      expect(schema).toHaveProperty(name);
      const table = (schema as any)[name];
      const config = getTableConfig(table);
      expect(config.name).toBeDefined();
    });
  });

  it('should NOT export domain-specific tables (moved to plugins)', () => {
    expect(schema).not.toHaveProperty('marketplaceBookings');
    expect(schema).not.toHaveProperty('commissionRates');
    expect(schema).not.toHaveProperty('reservations');
    expect(schema).not.toHaveProperty('roomTypes');
  });

  it('should have correct column definitions for users', () => {
    const config = getTableConfig(schema.users);
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('role');
  });

  it('should have correct relations or references for sessions', () => {
    const config = getTableConfig(schema.sessions);
    expect(config.columns.find((c) => c.name === 'user_id')).toBeDefined();
  });

  it('should have tenants table with correct columns', () => {
    const config = getTableConfig(schema.tenants);
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('slug');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('owner_id');
  });

  it('should have tenantPlugins table with correct columns', () => {
    const config = getTableConfig(schema.tenantPlugins);
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('property_id');
    expect(columnNames).toContain('plugin_name');
    expect(columnNames).toContain('is_enabled');
  });

  it('should have profiles table with correct columns', () => {
    const config = getTableConfig(schema.profiles);
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('full_name');
  });

  it('should have users table defined', () => {
    expect(schema.users).toBeDefined();
  });

  describe('PostgreSQL Branch', () => {
    it('should define tables using pgTable when not in test', async () => {
      vi.resetModules();
      vi.stubGlobal('process', {
        ...process,
        env: { ...process.env, NODE_ENV: 'production', VITEST: 'false' },
      });

      const prodSchema = await import('../schema');
      expect(prodSchema.users).toBeDefined();
      // Accessing the table object should hit the pgTable branch
      expect(prodSchema.users.id).toBeDefined();

      vi.unstubAllGlobals();
    });
  });
});
