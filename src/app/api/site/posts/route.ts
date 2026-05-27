import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { PostQuery } from '@/lib/PostQuery';
import { PostRepository } from '@/lib/PostRepository';
import { errorResponse } from '@/lib/errors';

/**
 * Resolves a siteId from the `siteId` query param (which may be a slug or UUID).
 * Returns null if the site is not found or inactive.
 */
function resolveSiteId(db: ReturnType<typeof getSqlite>, raw: string): string | null {
  const row = db
    .prepare('SELECT id FROM sites WHERE (id = ? OR slug = ?) AND is_active = 1 LIMIT 1')
    .get(raw, raw) as { id: string } | undefined;
  return row?.id ?? null;
}

/**
 * GET /api/site/posts
 *
 * Query params:
 *   siteId    — required: site UUID or slug
 *   type      — post type filter (default: all)
 *   status    — comma-separated statuses (default: publish)
 *   search    — full-text search on title/content
 *   limit     — 1–100 (default 20)
 *   skip      — offset (default 0)
 *   orderBy   — created_at | updated_at | menu_order | post_title
 *   order     — ASC | DESC
 *
 * Requires authenticated session (owner, manager, or master).
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

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = Math.max(0, parseInt(searchParams.get('skip') ?? '0', 10));
  if (isNaN(limit)) return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  if (isNaN(skip)) return NextResponse.json({ error: 'Invalid skip' }, { status: 400 });

  const rawType = searchParams.get('type');
  const rawStatus = searchParams.get('status');
  const search = searchParams.get('search') ?? undefined;
  const orderBy = (searchParams.get('orderBy') ?? 'created_at') as any;
  const order = ((searchParams.get('order') ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as
    | 'ASC'
    | 'DESC';

  const q = new PostQuery(db);

  const posts = q.query({
    siteId,
    ...(rawType ? { postType: rawType.split(',').map((t) => t.trim()) } : {}),
    ...(rawStatus ? { status: rawStatus.split(',').map((s) => s.trim()) } : { status: 'publish' }),
    search,
    orderBy,
    order,
    limit,
    offset: skip,
    includeMeta: true,
  });

  const total = q.count({
    siteId,
    ...(rawType ? { postType: rawType.split(',').map((t) => t.trim()) } : {}),
    ...(rawStatus ? { status: rawStatus.split(',').map((s) => s.trim()) } : { status: 'publish' }),
    search,
  });

  return NextResponse.json({ posts, total, limit, skip });
}

/**
 * POST /api/site/posts
 *
 * Body (JSON):
 *   siteId       — required
 *   postType     — required
 *   postTitle    — optional
 *   postContent  — optional
 *   postSlug     — optional
 *   postStatus   — optional (default: publish)
 *   meta         — optional: Record<string, string>
 *
 * Fires core:post:before_save filter and core:post:after_save action.
 */
const createPostSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  postType: z.string().min(1, 'postType is required'),
  postTitle: z.string().optional(),
  postContent: z.string().optional(),
  postSlug: z.string().optional(),
  postStatus: z.string().optional(),
  meta: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const { siteId: rawSiteId, postType, postTitle, postContent, postSlug, postStatus, meta } = parsed.data;

  const db = getSqlite();
  const siteId = resolveSiteId(db, rawSiteId);
  if (!siteId) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const repo = new PostRepository(db);
  try {
    const post = await repo.createPost({
      siteId,
      postType,
      postTitle: postTitle ?? '',
      postContent: postContent,
      postSlug: postSlug,
      postStatus: postStatus ?? 'publish',
      authorId: session.user.id,
      meta: meta ?? {},
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err: any) {
    return errorResponse(err);
  }
}
