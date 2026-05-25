import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
    if (!domain) {
      return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
    }

    const { user } = session;
    let property = (await db
      .prepare('SELECT id, plan FROM properties WHERE owner_id = ? AND is_active = true')
      .get(user.id)) as any;

    if (!property) {
      const staff = (await db
        .prepare('SELECT property_id FROM property_staff WHERE user_id = ? AND role IN (?, ?)')
        .get(user.id, 'manager', 'master')) as any;
      if (staff) {
        property = (await db
          .prepare('SELECT id, plan FROM properties WHERE id = ? AND is_active = true')
          .get(staff.property_id)) as any;
      }
    }

    if (!property) {
      return NextResponse.json({ error: 'No property found' }, { status: 404 });
    }

    if (property.plan !== 'ultimate') {
      return NextResponse.json(
        { error: 'Custom domains require the Ultimate plan' },
        { status: 403 }
      );
    }

    const existing = (await db
      .prepare('SELECT id FROM properties WHERE custom_domain = ? AND id != ?')
      .get(domain, property.id)) as any;
    if (existing) {
      return NextResponse.json({
        available: false,
        reason: 'Already in use by another property',
      });
    }

    const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cloudflareToken) {
      try {
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain.split('.').slice(-2).join('.'))}`,
          { headers: { Authorization: `Bearer ${cloudflareToken}` } }
        );
        const cfData = await cfRes.json();
        if (cfData.success && cfData.result.length > 0) {
          const zoneId = cfData.result[0].id;
          const dnsRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(domain)}&type=CNAME`,
            { headers: { Authorization: `Bearer ${cloudflareToken}` } }
          );
          const dnsData = await dnsRes.json();
          const exists = dnsData.success && dnsData.result.length > 0;
          return NextResponse.json({
            available: !exists,
            checkedWithCloudflare: true,
            domain,
          });
        }
      } catch {
        // Cloudflare check failed — fall through to basic validation
      }
    }

    const domainPattern = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    const valid = domainPattern.test(domain);

    return NextResponse.json({
      available: valid,
      checkedWithCloudflare: false,
      domain,
      note: valid
        ? 'Domain format is valid. Set up DNS to verify ownership.'
        : 'Invalid domain format',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Domain check failed' }, { status: 500 });
  }
}
