import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      full_name,
      property_name,
      slug,
      plan = 'basic',
      branding,
      custom_domain,
      type,
      city,
      country,
      currency_code,
    } = await req.json();

    if (!email || !password || !full_name || !property_name || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.transaction(async (tx) => {
      // 1. Check existing
      const existing = await tx
        .prepare('SELECT id FROM users WHERE email = $1')
        .get(normalizedEmail);
      if (existing) throw new Error('409:Email already registered');

      // 2. Create User
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      await tx
        .prepare('INSERT INTO users (id, email, password, is_verified) VALUES ($1, $2, $3, true)')
        .run(userId, normalizedEmail, hashedPassword);

      // 3. Create Property with branding settings
      const propertyId = uuidv4();
      const isPremiumPlan = plan === 'subdomain' || plan === 'custom_domain';
      const resolvedSubdomain = isPremiumPlan ? slug : null;
      const resolvedCustomDomain = plan === 'custom_domain' ? custom_domain || null : null;
      const settings = {
        branding: branding || {},
        features: {
          bookings: true,
          payments: true,
          reviews: true,
          loyalty: false,
          pos: false,
          excursions: true,
          blog: false,
        },
        theme: {
          mode: 'light',
        },
      };

      await tx
        .prepare(
          `
        INSERT INTO properties (
          id, owner_id, name, slug, plan, is_active, subdomain, custom_domain, domain_verified,
          type, city, country, currency_code, settings
        )
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $12, $13)
      `
        )
        .run(
          propertyId,
          userId,
          property_name,
          slug,
          plan,
          resolvedSubdomain,
          resolvedCustomDomain,
          plan === 'custom_domain' ? true : resolvedSubdomain ? true : false,
          type || 'camp',
          city || '',
          country || '',
          currency_code || 'USD',
          JSON.stringify(settings)
        );

      // 4. Create Profile
      await tx
        .prepare('INSERT INTO profiles (id, user_id, full_name) VALUES ($1, $2, $3)')
        .run(uuidv4(), userId, full_name);

      return { userId, propertyId };
    });

    if (!result) {
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        user: { id: result.userId, email: normalizedEmail },
        property: { id: result.propertyId, name: property_name, slug },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message.startsWith('409:')) {
      return NextResponse.json({ error: err.message.split(':')[1] }, { status: 409 });
    }
    console.error('[Owner Register] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
