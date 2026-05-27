import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { hookManager, Hooks } from '@/lib/hooks';
import { z } from 'zod';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

async function requireMaster(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  const role = (session.user as any).role ?? '';
  if (role !== 'master' && role !== 'marketplace_master') return null;
  return session;
}

/**
 * GET /api/admin/plugins/submissions
 *
 * Master-only. Returns plugin submissions filtered by status.
 *
 * Query params:
 *   status   — 'pending' | 'approved' | 'rejected' | omit for all
 *   limit    — 1–100 (default 50)
 *   skip     — offset (default 0)
 */
export async function GET(req: NextRequest) {
  const session = await requireMaster(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as SubmissionStatus | null;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const skip = Math.max(0, parseInt(searchParams.get('skip') ?? '0', 10));

  const validStatuses: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const db = getSqlite();

  const where = status ? 'WHERE status = ?' : '';
  const args = status ? [status, limit, skip] : [limit, skip];

  const rows = db
    .prepare(
      `SELECT * FROM plugin_submissions ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`
    )
    .all(...args) as any[];

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM plugin_submissions ${where}`)
    .get(...(status ? [status] : [])) as { count: number };

  const submissions = rows.map((r) => ({
    id: r.id,
    pluginId: r.plugin_id,
    submittedBy: r.submitted_by,
    version: r.version,
    zipUrl: r.zip_url,
    manifest: r.manifest ? JSON.parse(r.manifest) : null,
    reviewNotes: r.review_notes,
    status: r.status,
    reviewedBy: r.reviewed_by,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
  }));

  return NextResponse.json({ submissions, total: totalRow.count, limit, skip });
}

/**
 * PATCH /api/admin/plugins/submissions
 *
 * Master-only. Approve or reject a submission.
 *
 * Body (JSON):
 *   id           — required: submission UUID
 *   action       — required: 'approve' | 'reject'
 *   reviewNotes  — optional: string
 *
 * On approval: upserts the plugin into available_plugins with
 *   is_active=1, version from submission, manifest from submission.
 * Fires: core:plugin:activated (on approval) with { pluginId, version, reviewedBy }.
 */
const reviewSubmissionSchema = z.object({
  id: z.string(),
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireMaster(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }
  body = parsed.data;

  const { id, action, reviewNotes } = body;

  const db = getSqlite();
  const sub = db.prepare('SELECT * FROM plugin_submissions WHERE id = ?').get(id) as any;

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (sub.status !== 'pending') {
    return NextResponse.json({ error: `Submission is already ${sub.status}` }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const newStatus: SubmissionStatus = action === 'approve' ? 'approved' : 'rejected';

  db.prepare(
    `UPDATE plugin_submissions
     SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = ?
     WHERE id = ?`
  ).run(newStatus, session.user.id, reviewNotes ?? null, now, id);

  if (action === 'approve') {
    const manifest = sub.manifest ? JSON.parse(sub.manifest) : {};
    const displayName = manifest.displayName ?? manifest.name ?? sub.plugin_id;
    const description = manifest.description ?? null;
    const category = manifest.category ?? 'general';

    const existing = db
      .prepare('SELECT id FROM available_plugins WHERE name = ? LIMIT 1')
      .get(sub.plugin_id) as { id: string } | null;

    if (existing) {
      db.prepare(
        `UPDATE available_plugins
         SET version = ?, display_name = ?, description = ?, manifest = ?,
             is_active = 1, updated_at = ?
         WHERE name = ?`
      ).run(sub.version, displayName, description, sub.manifest, now, sub.plugin_id);
    } else {
      db.prepare(
        `INSERT INTO available_plugins
           (name, display_name, description, category, is_official, is_active, manifest, version, updated_at)
         VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?)`
      ).run(sub.plugin_id, displayName, description, category, sub.manifest, sub.version, now);
    }

    await hookManager.doAction(Hooks.CORE_PLUGIN_ACTIVATED, {
      pluginId: sub.plugin_id,
      version: sub.version,
      reviewedBy: session.user.id,
    });
  }

  AuditService.log({
    userId: session.user.id,
    action: `plugin_submission.${action}`,
    resource: 'plugin_submission',
    resourceId: id,
    details: { pluginId: sub.plugin_id, version: sub.version, reviewNotes },
  });

  const updated = db.prepare('SELECT * FROM plugin_submissions WHERE id = ?').get(id) as any;

  return NextResponse.json({
    submission: {
      id: updated.id,
      pluginId: updated.plugin_id,
      status: updated.status,
      reviewedBy: updated.reviewed_by,
      reviewNotes: updated.review_notes,
      reviewedAt: updated.reviewed_at,
    },
  });
}
