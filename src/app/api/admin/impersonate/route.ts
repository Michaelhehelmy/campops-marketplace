import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any)?.role;
    if (role !== 'master' && role !== 'marketplace_master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { propertyId } = body;
    const locale = body.locale || 'en';

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const property = await db.queryOne('SELECT id, slug, name FROM properties WHERE id = ?', [
      propertyId,
    ]);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const prop = property as any;
    const impersonationData = {
      propertyId: String(prop.id),
      propertySlug: prop.slug,
      propertyName: prop.name,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    const redirectUrl = `/${locale}/manage/${prop.slug}`;

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      property: { slug: prop.slug, name: prop.name },
    });

    response.cookies.set('sinaicamps_impersonating', JSON.stringify(impersonationData), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 60,
    });

    return response;
  } catch (err: any) {
    logger.error('[Impersonate API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create impersonation session' },
      { status: 500 }
    );
  }
}
