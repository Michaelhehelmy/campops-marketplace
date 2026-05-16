import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from '../audit';
import { db } from '../db';

describe('AuditService', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM audit_logs');
  });

  it('should log an audit entry', async () => {
    AuditService.log({
      userId: 'admin-1',
      action: 'plugin.enable',
      resource: 'plugin',
      resourceId: 'loyalty',
      details: { reason: 'needed' },
      propertyId: 'prop-1',
    });

    // Wait for async write
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ limit: 10 });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const entry = entries.find((e) => e.action === 'plugin.enable');
    expect(entry).toBeDefined();
    expect(entry!.userId).toBe('admin-1');
    expect(entry!.resource).toBe('plugin');
    expect(entry!.resourceId).toBe('loyalty');
    expect(entry!.details).toEqual({ reason: 'needed' });
    expect(entry!.propertyId).toBe('prop-1');
  });

  it('should filter by userId', async () => {
    AuditService.log({ userId: 'admin-1', action: 'login', resource: 'auth' });
    AuditService.log({ userId: 'admin-2', action: 'logout', resource: 'auth' });
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ userId: 'admin-1', limit: 10 });
    expect(entries.every((e) => e.userId === 'admin-1')).toBe(true);
  });

  it('should filter by action', async () => {
    AuditService.log({ userId: 'admin-1', action: 'create', resource: 'booking' });
    AuditService.log({ userId: 'admin-1', action: 'delete', resource: 'booking' });
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ action: 'create', limit: 10 });
    expect(entries.every((e) => e.action === 'create')).toBe(true);
  });

  it('should filter by resource', async () => {
    AuditService.log({ userId: 'admin-1', action: 'update', resource: 'plugin' });
    AuditService.log({ userId: 'admin-1', action: 'update', resource: 'property' });
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ resource: 'plugin', limit: 10 });
    expect(entries.every((e) => e.resource === 'plugin')).toBe(true);
  });

  it('should filter by propertyId', async () => {
    AuditService.log({
      userId: 'admin-1',
      action: 'view',
      resource: 'dashboard',
      propertyId: 'prop-1',
    });
    AuditService.log({
      userId: 'admin-1',
      action: 'view',
      resource: 'dashboard',
      propertyId: 'prop-2',
    });
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ propertyId: 'prop-1', limit: 10 });
    expect(entries.every((e) => e.propertyId === 'prop-1')).toBe(true);
  });

  it('should respect limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      AuditService.log({ userId: 'admin-1', action: `action-${i}`, resource: 'test' });
    }
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ limit: 2, offset: 1 });
    expect(entries.length).toBeLessThanOrEqual(2);
  });

  it('should handle entries without optional fields', async () => {
    AuditService.log({ userId: 'admin-1', action: 'minimal', resource: 'test' });
    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ limit: 10 });
    const entry = entries.find((e) => e.action === 'minimal');
    expect(entry).toBeDefined();
    expect(entry!.details).toBeUndefined();
    expect(entry!.propertyId).toBeNull();
  });
});
