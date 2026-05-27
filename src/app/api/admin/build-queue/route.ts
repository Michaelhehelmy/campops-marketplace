import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface BuildRow {
  id: string;
  site_id: string;
  status: string;
  triggered_by: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
}

/**
 * GET /api/admin/build-queue?status=<pending|running|done|failed>&siteId=<id>
 * Master admin only. Lists build queue entries, newest first.
 *
 * POST /api/admin/build-queue
 * Body: { siteId }
 * Master admin only. Manually enqueues a build for the specified site.
 */

async function requireMaster(req: NextRequest): Promise<boolean> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return false;
  const role = (session.user as any).role;
  return role === 'master' || role === 'marketplace_master';
}

export async function GET(req: NextRequest) {
  if (!(await requireMaster(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get('status');
  const siteId = req.nextUrl.searchParams.get('siteId');

  try {
    const db = getSqlite();
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (status) {
      conditions.push('status = ?');
      bindings.push(status);
    }
    if (siteId) {
      conditions.push('site_id = ?');
      bindings.push(siteId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM build_queue ${where} ORDER BY created_at DESC LIMIT 100`)
      .all(...bindings) as BuildRow[];

    return NextResponse.json({ builds: rows, total: rows.length });
  } catch (err: any) {
    logger.error('[Build Queue GET] Error:', err);
    return errorResponse(err);
  }
}

const enqueueBuildSchema = z.object({
  siteId: z.string(),
});

export async function POST(req: NextRequest) {
  if (!(await requireMaster(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { siteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = enqueueBuildSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }
  body = parsed.data;

  const { siteId } = body;
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const db = getSqlite();

    const session = await auth.api.getSession({ headers: req.headers });
    const actorId = session?.user?.id ?? null;

    const result = db
      .prepare(
        `INSERT INTO build_queue (site_id, status, triggered_by, created_at)
         VALUES (?, 'pending', ?, unixepoch())`
      )
      .run(siteId, actorId);

    const inserted = db
      .prepare('SELECT * FROM build_queue WHERE rowid = ?')
      .get(result.lastInsertRowid) as BuildRow;

    return NextResponse.json({ success: true, build: inserted }, { status: 201 });
  } catch (err: any) {
    logger.error('[Build Queue POST] Error:', err);
    return errorResponse(err);
  }
}
