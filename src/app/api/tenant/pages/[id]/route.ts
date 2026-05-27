import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const row = db.prepare('SELECT * FROM tenant_pages WHERE id = ?').get(params.id) as any;
    if (!row) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const updatePageSchema = z.object({
  slug: z.string().optional(),
  title: z.string().optional(),
  content: z.string().nullable().optional(),
  meta: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  isPublished: z.union([z.literal(0), z.literal(1)]).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parsed = updatePageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const now = Date.now();
    const existing = db.prepare('SELECT id FROM tenant_pages WHERE id = ?').get(params.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    db.prepare(
      `UPDATE tenant_pages SET slug = ?, title = ?, content = ?, meta = ?, sort_order = ?, is_published = ?, updated_at = ? WHERE id = ?`
    ).run(
      body.slug ?? '',
      body.title ?? '',
      body.content ?? null,
      body.meta ?? null,
      body.sortOrder ?? 0,
      body.isPublished ?? 1,
      now,
      params.id
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = db.prepare('SELECT id FROM tenant_pages WHERE id = ?').get(params.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    db.prepare('DELETE FROM tenant_pages WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
