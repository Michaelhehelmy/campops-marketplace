import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db
      .prepare('SELECT * FROM profiles WHERE user_id = ?')
      .get(session.user.id);

    return NextResponse.json({
      user: session.user,
      profile: profile || {
        fullName: session.user.name,
        bio: '',
        phone: '',
      },
    });
  } catch (err: any) {
    console.error('[Guest Profile API] GET Error:', err);
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, bio, phone } = body;

    // Check if profile exists
    const existing = await db
      .prepare('SELECT id FROM profiles WHERE user_id = ?')
      .get(session.user.id);

    if (existing) {
      await db
        .prepare('UPDATE profiles SET full_name = ?, bio = ?, phone = ? WHERE user_id = ?')
        .run(fullName, bio, phone, session.user.id);
    } else {
      const profileId = 'prof_' + Math.random().toString(36).substring(7);
      await db
        .prepare('INSERT INTO profiles (id, user_id, full_name, bio, phone) VALUES (?, ?, ?, ?, ?)')
        .run(profileId, session.user.id, fullName, bio, phone);
    }

    // Also update user name in users table if changed
    if (fullName && fullName !== session.user.name) {
      await db.prepare('UPDATE users SET name = ? WHERE id = ?').run(fullName, session.user.id);
    }

    AuditService.log({
      userId: session.user.id,
      action: 'profile.update',
      resource: 'profile',
      resourceId: session.user.id,
      details: { fullName, bio },
    });

    return NextResponse.json({ ok: true, message: 'Profile updated' });
  } catch (err: any) {
    console.error('[Guest Profile API] POST Error:', err);
    return errorResponse(err);
  }
}
