import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from '@/lib/audit';
import { db } from '@/lib/db';

describe('Audit logging for mutation routes', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM audit_logs');
  });

  it('should record plugin.enable audit event with correct resource and action', async () => {
    AuditService.log({
      userId: 'user-123',
      action: 'plugin.enable',
      resource: 'plugin',
      resourceId: 'booking',
      propertyId: 'prop-1',
      details: { config: {} },
    });

    await new Promise((r) => setTimeout(r, 50));

    const entries = await AuditService.query({ action: 'plugin.enable', limit: 10 });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const entry = entries[0];
    expect(entry.userId).toBe('user-123');
    expect(entry.resource).toBe('plugin');
    expect(entry.resourceId).toBe('booking');
    expect(entry.propertyId).toBe('prop-1');
  });

  it('should record distinct audit events for branding.update and domain.reserve actions', async () => {
    AuditService.log({
      userId: 'admin-1',
      action: 'branding.update',
      resource: 'property',
      resourceId: 'prop-1',
      details: { brandingKeys: ['colors', 'logo'] },
    });

    AuditService.log({
      userId: 'manager-1',
      action: 'domain.reserve',
      resource: 'property',
      resourceId: 'prop-2',
      details: { domain: 'example.com' },
    });

    await new Promise((r) => setTimeout(r, 50));

    const brandingEntries = await AuditService.query({ action: 'branding.update', limit: 10 });
    expect(brandingEntries.length).toBeGreaterThanOrEqual(1);
    expect(brandingEntries[0].userId).toBe('admin-1');
    expect(brandingEntries[0].resourceId).toBe('prop-1');

    const domainEntries = await AuditService.query({ action: 'domain.reserve', limit: 10 });
    expect(domainEntries.length).toBeGreaterThanOrEqual(1);
    expect(domainEntries[0].userId).toBe('manager-1');
    expect(domainEntries[0].resourceId).toBe('prop-2');
  });
});
