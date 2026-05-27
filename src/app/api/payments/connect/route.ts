import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Stripe from 'stripe';
import { requireSession, isErrorResponse } from '@/lib/auth-middleware';
import { AuditService } from '@/lib/audit';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

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
    const sessionRes = await requireSession(req);
    if (isErrorResponse(sessionRes)) return sessionRes;
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
    logger.error('[Stripe Connect Get API] Error:', err);
    return errorResponse(err);
  }
}

// POST /api/payments/connect - Create or update Stripe Connect account
export async function POST(req: NextRequest) {
  try {
    const sessionRes = await requireSession(req);
    if (isErrorResponse(sessionRes)) return sessionRes;
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

    AuditService.log({
      userId: sessionRes.user.id,
      action: existing ? 'stripe_connect.updated' : 'stripe_connect.created',
      resource: 'stripe_connect_accounts',
      resourceId: account?.id as string | undefined,
      propertyId,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      account,
      message: 'Stripe Connect account linked successfully',
    });
  } catch (err: any) {
    logger.error('[Stripe Connect Create API] Error:', err);
    return errorResponse(err);
  }
}

// PUT /api/payments/connect - Update Stripe Connect account status (webhook handler)
export async function PUT(req: NextRequest) {
  try {
    // Idempotency check: skip processing if this event was already handled
    const idempotencyKey =
      req.headers.get('Idempotency-Key') ||
      req.headers.get('idempotency-key') ||
      req.headers.get('Stripe-Idempotency-Key');
    if (idempotencyKey) {
      const existing = await db.queryOne('SELECT response FROM idempotency_keys WHERE key = ?', [
        idempotencyKey,
      ]);
      if (existing) {
        return NextResponse.json(JSON.parse(existing.response), { status: 200 });
      }
    }

    const signature = req.headers.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeAccountId: string | undefined;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let requirementsDue: string[] = [];
    let onboardingComplete = false;

    const rawBody = await req.text();

    if (secret && signature) {
      try {
        const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        if (event.type === 'account.updated') {
          const account = event.data.object as Stripe.Account;
          stripeAccountId = account.id;
          chargesEnabled = account.charges_enabled;
          payoutsEnabled = account.payouts_enabled;
          requirementsDue = account.requirements?.currently_due || [];
          onboardingComplete = account.details_submitted;
        } else {
          return NextResponse.json({ message: `Event ${event.type} ignored` }, { status: 200 });
        }
      } catch (err: any) {
        logger.error('[Stripe Webhook Signature Verification Failed]', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('⚠️ Stripe webhook secret or signature missing in production environment');
      } else {
        logger.warn(
          '⚠️ Stripe webhook secret not configured. Skipping signature verification in local dev.'
        );
      }

      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      stripeAccountId = body.stripeAccountId;
      chargesEnabled = body.chargesEnabled;
      payoutsEnabled = body.payoutsEnabled;
      requirementsDue = body.requirementsDue;
      onboardingComplete = body.onboardingComplete;
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'stripeAccountId is required' }, { status: 400 });
    }

    // Update account status and record idempotency in a transaction
    let account: any = null;
    const txOk = await db.transaction(async (tx) => {
      await tx
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

      account = await tx
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE stripe_account_id = $1
      `
        )
        .get(stripeAccountId);

      // Persist idempotency key inside the same transaction
      if (idempotencyKey) {
        await tx
          .prepare(
            'INSERT OR IGNORE INTO idempotency_keys (key, response, created_at) VALUES ($1, $2, $3)'
          )
          .run(
            idempotencyKey,
            JSON.stringify({ success: true, account, message: 'Stripe Connect account updated' }),
            Math.floor(Date.now() / 1000)
          );
      }

      return true;
    });

    if (!txOk) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    AuditService.log({
      userId: 'system',
      action: 'stripe_connect.webhook_updated',
      resource: 'stripe_connect_accounts',
      resourceId: stripeAccountId,
      details: { chargesEnabled, payoutsEnabled, onboardingComplete },
    });

    return NextResponse.json({
      success: true,
      account,
      message: 'Stripe Connect account updated',
    });
  } catch (err: any) {
    logger.error('[Stripe Connect Update API] Error:', err);
    return errorResponse(err);
  }
}
