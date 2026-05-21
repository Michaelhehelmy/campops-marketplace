import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { hookManager, Hooks } from '@/lib/hooks';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/plugins/submit
 *
 * Developer-facing endpoint: submit a plugin for marketplace review.
 *
 * Body (JSON):
 *   pluginId   — required: unique plugin identifier (e.g. "my-org/my-plugin")
 *   version    — required: semver string
 *   manifest   — required: object; must contain at least { name, description }
 *   zipUrl     — optional: URL to the plugin zip archive
 *
 * Fires: core:plugin:submitted action with the created submission object.
 *
 * Returns 409 if a pending/approved submission for the same pluginId+version exists.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pluginId, version, manifest, zipUrl } = body;

  if (!pluginId || typeof pluginId !== 'string' || !pluginId.trim()) {
    return NextResponse.json({ error: 'pluginId is required' }, { status: 400 });
  }
  if (!version || typeof version !== 'string' || !version.trim()) {
    return NextResponse.json({ error: 'version is required' }, { status: 400 });
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return NextResponse.json({ error: 'manifest must be an object' }, { status: 400 });
  }
  if (!manifest.name || !manifest.description) {
    return NextResponse.json(
      { error: 'manifest must include name and description' },
      { status: 400 }
    );
  }

  const db = getSqlite();

  const duplicate = db
    .prepare(
      `SELECT id FROM plugin_submissions
       WHERE plugin_id = ? AND version = ? AND status IN ('pending', 'approved')
       LIMIT 1`
    )
    .get(pluginId.trim(), version.trim()) as { id: string } | null;

  if (duplicate) {
    return NextResponse.json(
      { error: 'A pending or approved submission for this plugin version already exists' },
      { status: 409 }
    );
  }

  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(
    `INSERT INTO plugin_submissions
       (id, plugin_id, submitted_by, version, zip_url, manifest, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    id,
    pluginId.trim(),
    session.user.id,
    version.trim(),
    zipUrl ?? null,
    JSON.stringify(manifest),
    now
  );

  const submission = db.prepare('SELECT * FROM plugin_submissions WHERE id = ?').get(id) as any;

  await hookManager.doAction(Hooks.CORE_PLUGIN_SUBMITTED, {
    ...submission,
    manifest,
  });

  AuditService.log({
    userId: session.user.id,
    action: 'plugin.submit',
    resource: 'plugin',
    resourceId: id,
    details: { pluginId: pluginId.trim(), version: version.trim(), manifest },
  });

  return NextResponse.json(
    {
      submission: {
        id: submission.id,
        pluginId: submission.plugin_id,
        version: submission.version,
        status: submission.status,
        submittedAt: submission.submitted_at,
      },
    },
    { status: 201 }
  );
}
