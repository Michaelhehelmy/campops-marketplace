import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to verify user has access to property
async function verifyPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  // Check if user is the owner
  const property = await db
    .prepare(
      `
    SELECT owner_id FROM properties WHERE id = $1
  `
    )
    .get(propertyId);

  if (property?.owner_id === userId) return true;

  // Check if user has staff access
  const staff = await db
    .prepare(
      `
    SELECT 1 FROM property_staff WHERE property_id = $1 AND user_id = $2
  `
    )
    .get(propertyId, userId);

  return !!staff;
}

// GET /api/payments/connect - Get Stripe Connect account for a property
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const propertyId = searchParams.get('propertyId');
    const userId = searchParams.get('userId');

    if (!propertyId || !userId) {
      return NextResponse.json({ error: 'propertyId and userId are required' }, { status: 400 });
    }

    // Verify access
    const hasAccess = await verifyPropertyAccess(userId, propertyId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const account = await db
      .prepare(
        `
      SELECT 
        id,
        stripe_account_id,
        stripe_account_type,
        charges_enabled,
        payouts_enabled,
        requirements_due,
        country,
        currency,
        onboarding_complete,
        onboarding_url,
        created_at,
        updated_at
      FROM stripe_connect_accounts
      WHERE property_id = $1
    `
      )
      .get(propertyId);

    if (!account) {
      return NextResponse.json({
        account: null,
        message: 'No Stripe Connect account found for this property',
      });
    }

    return NextResponse.json({ account });
  } catch (err: any) {
    console.error('[Stripe Connect Get API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/payments/connect - Create or update Stripe Connect account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      propertyId,
      stripeAccountId,
      accountType = 'express',
      country = 'US',
      currency = 'usd',
    } = body;

    if (!userId || !propertyId || !stripeAccountId) {
      return NextResponse.json(
        {
          error: 'userId, propertyId, and stripeAccountId are required',
        },
        { status: 400 }
      );
    }

    // Verify user owns this property
    const property = await db
      .prepare(
        `
      SELECT owner_id FROM properties WHERE id = $1
    `
      )
      .get(propertyId);

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Only property owner can setup Stripe Connect' },
        { status: 403 }
      );
    }

    // Check if account already exists
    const existing = await db
      .prepare(
        `
      SELECT id FROM stripe_connect_accounts WHERE property_id = $1
    `
      )
      .get(propertyId);

    let account;
    if (existing) {
      // Update existing account
      await db
        .prepare(
          `
        UPDATE stripe_connect_accounts 
        SET stripe_account_id = $1, 
            stripe_account_type = $2,
            country = $3,
            currency = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE property_id = $5
      `
        )
        .run(stripeAccountId, accountType, country, currency, propertyId);

      account = await db
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE property_id = $1
      `
        )
        .get(propertyId);
    } else {
      // Create new account record
      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, country, currency, charges_enabled, payouts_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, false, false)
      `
        )
        .run(propertyId, userId, stripeAccountId, accountType, country, currency);

      account = await db
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE stripe_account_id = $1
      `
        )
        .get(stripeAccountId);
    }

    return NextResponse.json({
      success: true,
      account,
      message: 'Stripe Connect account linked successfully',
    });
  } catch (err: any) {
    console.error('[Stripe Connect Create API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/payments/connect - Update Stripe Connect account status (webhook handler)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { stripeAccountId, chargesEnabled, payoutsEnabled, requirementsDue, onboardingComplete } =
      body;

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'stripeAccountId is required' }, { status: 400 });
    }

    // Update account status
    await db
      .prepare(
        `
      UPDATE stripe_connect_accounts 
      SET charges_enabled = $1,
          payouts_enabled = $2,
          requirements_due = $3,
          onboarding_complete = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE stripe_account_id = $5
    `
      )
      .run(
        chargesEnabled ?? false,
        payoutsEnabled ?? false,
        JSON.stringify(requirementsDue ?? []),
        onboardingComplete ?? false,
        stripeAccountId
      );

    const account = await db
      .prepare(
        `
      SELECT * FROM stripe_connect_accounts WHERE stripe_account_id = $1
    `
      )
      .get(stripeAccountId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account,
      message: 'Stripe Connect account updated',
    });
  } catch (err: any) {
    console.error('[Stripe Connect Update API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
