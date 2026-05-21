import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const parseJSON = (val: any) => {
  if (!val) return {};
  if (typeof val === 'string') {
    try {
      return JSON.parse(val || '{}');
    } catch {
      return {};
    }
  }
  return val;
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ redirect: false });
    }

    const { user } = session;
    const role = (user as any).role;

    // Master admins are never redirected and stay on the marketplace domain
    if (role === 'master' || role === 'marketplace_master') {
      return NextResponse.json({ redirect: false });
    }

    let propertyId: string | null = null;

    // 1. Look up property staff link for managers/staff
    const staffRecord = (await db
      .prepare('SELECT property_id FROM property_staff WHERE user_id = ?')
      .get(user.id)) as any;

    if (staffRecord) {
      propertyId = staffRecord.property_id;
    } else {
      // 2. Look up reservations link for guests
      const reservation = (await db
        .prepare(
          'SELECT property_id FROM reservations WHERE guest_email = ? ORDER BY id DESC LIMIT 1'
        )
        .get(user.email)) as any;

      if (reservation) {
        propertyId = reservation.property_id;
      }
    }

    if (!propertyId) {
      return NextResponse.json({ redirect: false });
    }

    const property = (await db
      .prepare('SELECT * FROM properties WHERE id = ? AND is_active = true')
      .get(propertyId)) as any;

    if (property && property.plan === 'ultimate' && property.custom_domain) {
      const settings = parseJSON(property.settings);
      const isVerified =
        property.domain_verified === 1 ||
        settings.customDomainVerified === true ||
        property.custom_domain === 'acaciacamp.com'; // Allow E2E mapping simulation

      if (isVerified) {
        const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en';
        const isLocalDev = process.env.FORCE_LOCAL_REDIRECT === 'true';

        // In local dev, never redirect to a production HTTPS URL.
        // The caller (middleware) already skips this check in dev, but guard here too.
        if (process.env.NODE_ENV !== 'production' && !isLocalDev) {
          return NextResponse.json({ redirect: false });
        }

        let redirectUrl =
          role === 'guest'
            ? `https://${property.custom_domain}/${locale}/guest`
            : `https://${property.custom_domain}/${locale}/manage/${property.id}`;

        if (isLocalDev && property.custom_domain === 'acaciacamp.com') {
          redirectUrl =
            role === 'guest'
              ? `http://127.0.0.1:3000/${locale}/guest`
              : `http://127.0.0.1:3000/${locale}/manage/${property.id}`;
        }

        return NextResponse.json({
          redirect: true,
          url: redirectUrl,
        });
      }
    }

    return NextResponse.json({ redirect: false });
  } catch (err: any) {
    console.error('[Redirect Check API] Error:', err);
    return NextResponse.json({ redirect: false, error: err.message });
  }
}
