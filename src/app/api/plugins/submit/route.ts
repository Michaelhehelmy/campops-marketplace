import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { hookManager, Hooks } from '@/lib/hooks';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const submitBodySchema = z.object({
  pluginId: z.string().min(1, 'pluginId is required'),
  version: z.string().min(1, 'version is required'),
  manifest: z
    .object({
      name: z.string().min(1, 'manifest name is required'),
      description: z.string().min(1, 'manifest description is required'),
    })
    .passthrough(),
  zipUrl: z.string().optional(),
});

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

  let parsed: any;
  try {
    parsed = submitBodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const { pluginId, version, manifest, zipUrl } = parsed.data;

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
