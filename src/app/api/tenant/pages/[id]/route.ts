import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
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
