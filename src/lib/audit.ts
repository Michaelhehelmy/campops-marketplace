import { db } from './db';
import { logger } from './logger';

export interface AuditEntry {
  id?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  propertyId?: string;
  ipAddress?: string;
  createdAt?: string;
}

export class AuditService {
  /**
   * Record an audit entry. Returns immediately; the write happens in the background.
   */
  static log(entry: AuditEntry): void {
    this.writeEntry(entry).catch((err) => {
      logger.error('Failed to write audit entry:', err);
    });
  }

  private static async writeEntry(entry: AuditEntry): Promise<void> {
    const id = entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, property_id, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        entry.userId,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.propertyId || null,
        entry.ipAddress || null,
      ]
    );
  }

  /**
   * Query audit logs with optional filters.
   */
  static async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    propertyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.userId) {
      conditions.push('user_id = ?');
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push('action = ?');
      params.push(filters.action);
    }
    if (filters.resource) {
      conditions.push('resource = ?');
      params.push(filters.resource);
    }
    if (filters.propertyId) {
      conditions.push('property_id = ?');
      params.push(filters.propertyId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const rows = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      resource: r.resource,
      resourceId: r.resource_id,
      details: r.details ? JSON.parse(r.details) : undefined,
      propertyId: r.property_id,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    }));
  }
}
