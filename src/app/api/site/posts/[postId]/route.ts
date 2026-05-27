import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getSqlite } from '@/lib/db';
import { PostRepository } from '@/lib/PostRepository';

type Ctx = { params: { postId: string } };

/**
 * GET /api/site/posts/[postId]
 * Returns the post with all meta. No siteId scope needed — postId is globally unique (UUID).
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSqlite();
  const repo = new PostRepository(db);
  const post = repo.getById(params.postId);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post });
}

/**
 * PUT /api/site/posts/[postId]
 *
 * Body (JSON) — all fields optional:
 *   postTitle, postContent, postSlug, postStatus, menuOrder, parentId
 *   meta: Record<string, string | null>  — upserts each key; null removes the key
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const updatePostSchema = z.object({
    postTitle: z.string().optional(),
    postContent: z.string().optional(),
    postSlug: z.string().optional(),
    postStatus: z.string().optional(),
    menuOrder: z.number().optional(),
    parentId: z.string().optional(),
    meta: z.record(z.string(), z.string().nullable()).optional(),
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const db = getSqlite();
  const repo = new PostRepository(db);

  const existing = repo.getById(params.postId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { meta, ...postFields } = parsed.data;

  const updated = repo.updatePost(params.postId, {
    postTitle: postFields.postTitle,
    postContent: postFields.postContent,
    postSlug: postFields.postSlug,
    postStatus: postFields.postStatus,
    menuOrder: postFields.menuOrder,
    ...('parentId' in postFields ? { parentId: postFields.parentId } : {}),
  });

  if (meta && typeof meta === 'object') {
    for (const [key, value] of Object.entries(meta)) {
      if (value === null) {
        repo.deleteMeta(params.postId, key);
      } else {
        repo.setMeta(params.postId, key, value as string);
      }
    }
  }

  const post = repo.getById(params.postId);
  return NextResponse.json({ post: post ?? updated });
}

/**
 * DELETE /api/site/posts/[postId]
 *
 * Query param `hard=1` performs a hard delete (cascades postmeta).
 * Default is a soft trash (post_status = 'trash').
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSqlite();
  const repo = new PostRepository(db);

  const existing = repo.getById(params.postId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hard = req.nextUrl.searchParams.get('hard') === '1';
  if (hard) {
    await repo.deletePost(params.postId);
    return NextResponse.json({ deleted: true });
  } else {
    repo.trashPost(params.postId);
    return NextResponse.json({ trashed: true });
  }
}
