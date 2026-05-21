import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { OptionsRepository } from '@/lib/OptionsRepository';

function resolveSiteId(db: ReturnType<typeof getSqlite>, raw: string): string | null {
  const row = db
    .prepare('SELECT id FROM sites WHERE (id = ? OR slug = ?) AND is_active = 1 LIMIT 1')
    .get(raw, raw) as { id: string } | undefined;
  return row?.id ?? null;
}

/**
 * GET /api/site/options
 *
 * Query params:
 *   siteId  — required: site UUID or slug
 *   keys    — comma-separated option names to fetch; omit for all options
 *
 * Requires authenticated session.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const rawSiteId = searchParams.get('siteId');
  if (!rawSiteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const db = getSqlite();
  const siteId = resolveSiteId(db, rawSiteId);
  if (!siteId) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const opts = new OptionsRepository(db);
  const rawKeys = searchParams.get('keys');

  if (rawKeys) {
    const keys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const options: Record<string, string | null> = {};
    for (const key of keys) {
      options[key] = opts.getOption(siteId, key);
    }
    return NextResponse.json({ options });
  }

  const options = opts.getAllOptions(siteId);
  return NextResponse.json({ options });
}

/**
 * PUT /api/site/options
 *
 * Body (JSON):
 *   siteId   — required
 *   options  — Record<string, string | null>
 *              null value deletes the option; any other string upserts it
 *
 * Fires core:option:set action for each key written.
 */
export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { siteId: rawSiteId, options } = body;
  if (!rawSiteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return NextResponse.json({ error: 'options must be an object' }, { status: 400 });
  }

  const db = getSqlite();
  const siteId = resolveSiteId(db, rawSiteId);
  if (!siteId) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const repo = new OptionsRepository(db);
  const updated: string[] = [];
  const deleted: string[] = [];

  for (const [key, value] of Object.entries(options)) {
    if (value === null) {
      repo.deleteOption(siteId, key);
      deleted.push(key);
    } else {
      repo.setOption(siteId, key, value as string);
      updated.push(key);
    }
  }

  return NextResponse.json({ updated, deleted });
}
