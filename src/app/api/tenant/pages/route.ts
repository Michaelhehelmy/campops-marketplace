import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }
    const rows = db
      .prepare(
        `SELECT id, slug, title, content, meta, sort_order, is_published, created_at, updated_at
         FROM tenant_pages WHERE property_id = ? ORDER BY sort_order ASC`
      )
      .all(propertyId);
    return NextResponse.json({ pages: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const createPageSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
  slug: z.string().min(1, 'slug is required'),
  title: z.string().min(1, 'title is required'),
  content: z.string().optional(),
  meta: z.string().optional(),
  sortOrder: z.number().optional(),
  isPublished: z.union([z.literal(0), z.literal(1)]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parsed = createPageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const { propertyId, slug, title, content, meta, sortOrder, isPublished } = parsed.data;
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(
      `INSERT INTO tenant_pages (id, property_id, slug, title, content, meta, sort_order, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, propertyId, slug, title, content || null, meta || null, sortOrder ?? 0, isPublished ?? 1, now, now);
    return NextResponse.json({ id, slug, title }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
