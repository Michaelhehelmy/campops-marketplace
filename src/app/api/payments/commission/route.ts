import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, isErrorResponse } from '@/lib/auth-middleware';
import { AuditService } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const commissionPostSchema = z.object({
  bookingId: z.string().min(1),
  stripeAccountId: z.string().min(1),
  platformFeeCents: z.number().int().nonnegative().optional(),
});

const commissionPutSchema = z.object({
  transactionId: z.string().min(1),
  status: z.string().min(1),
  stripeTransferId: z.string().optional(),
  failureReason: z.string().optional(),
});

// Helper to calculate commission
async function calculateCommission(
  propertyId: string,
  totalAmountCents: number,
  appliesTo: string = 'all'
): Promise<{ rate: number; commissionCents: number; netPayoutCents: number }> {
  // Get commission rate for property (or global default)
  let rateResult = await db
    .prepare(
      `
    SELECT rate_percentage, flat_fee_cents, minimum_commission_cents, maximum_commission_cents
    FROM commission_rates
    WHERE (property_id = $1 OR property_id IS NULL)
      AND (applies_to = $2 OR applies_to = 'all')
      AND is_active = true
    ORDER BY property_id NULLS LAST, created_at DESC
    LIMIT 1
  `
    )
    .get(propertyId, appliesTo);

  // Fallback to default if no rate found
  if (!rateResult) {
    rateResult = {
      rate_percentage: 10.0,
      flat_fee_cents: 0,
      minimum_commission_cents: 0,
      maximum_commission_cents: null,
    };
  }

  const rate = rateResult.rate_percentage;
  let commissionCents =
    Math.round(totalAmountCents * (rate / 100)) + (rateResult.flat_fee_cents || 0);

  // Apply min/max constraints
  if (
    rateResult.minimum_commission_cents &&
    commissionCents < rateResult.minimum_commission_cents
  ) {
    commissionCents = rateResult.minimum_commission_cents;
  }
  if (
    rateResult.maximum_commission_cents &&
    commissionCents > rateResult.maximum_commission_cents
  ) {
    commissionCents = rateResult.maximum_commission_cents;
  }

  const netPayoutCents = totalAmountCents - commissionCents;

  return { rate, commissionCents, netPayoutCents };
}

// GET /api/payments/commission - Get commission rates or transactions
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req);
    if (isErrorResponse(session)) return session;
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type'); // 'rates' or 'transactions'
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    if (type === 'rates') {
      // Get commission rates for property
      const rates = await db
        .prepare(
          `
        SELECT * FROM commission_rates 
        WHERE property_id = $1 OR property_id IS NULL
        ORDER BY property_id NULLS LAST, created_at DESC
      `
        )
        .all(propertyId);

      return NextResponse.json({ rates });
    } else {
      // Get commission transactions
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const status = searchParams.get('status');

      let whereClause = 'WHERE ct.property_id = $1';
      const params: any[] = [propertyId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const countResult = await db
        .prepare(
          `
        SELECT COUNT(*) as total FROM commission_transactions ct ${whereClause}
      `
        )
        .get(...params);

      const total = parseInt(countResult?.total || '0');

      const transactions = await db
        .prepare(
          `
        SELECT 
          ct.*,
          mb.guest_name,
          mb.guest_email,
          mb.total_amount_cents as booking_total
        FROM commission_transactions ct
        JOIN marketplace_bookings mb ON mb.id = ct.booking_id
        ${whereClause}
        ORDER BY ct.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
        )
        .all(...params, limit, offset);

      // Calculate summary
      const summary = await db
        .prepare(
          `
        SELECT 
          COALESCE(SUM(total_amount_cents), 0) as total_revenue_cents,
          COALESCE(SUM(commission_amount_cents), 0) as total_commission_cents,
          COALESCE(SUM(net_payout_cents), 0) as total_net_payout_cents,
          COUNT(*) as total_transactions
        FROM commission_transactions
        WHERE property_id = $1
      `
        )
        .get(propertyId);

      return NextResponse.json({
        transactions,
        summary,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total,
        },
      });
    }
  } catch (err: any) {
    logger.error('[Commission API] Error:', err);
    return errorResponse(err);
  }
}

// POST /api/payments/commission - Calculate and record commission for a booking
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    if (isErrorResponse(session)) return session;

    // Idempotency check
    const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');
    if (idempotencyKey) {
      const existing = await db.queryOne('SELECT response FROM idempotency_keys WHERE key = ?', [
        idempotencyKey,
      ]);
      if (existing) {
        return NextResponse.json(JSON.parse(existing.response), { status: 200 });
      }
    }

    const parsed = commissionPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const { bookingId, stripeAccountId, platformFeeCents = 0 } = body;

    if (!bookingId || !stripeAccountId) {
      return NextResponse.json(
        {
          error: 'bookingId and stripeAccountId are required',
        },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await db
      .prepare(
        `
      SELECT * FROM marketplace_bookings WHERE id = $1
    `
      )
      .get(bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Calculate commission
    const { rate, commissionCents, netPayoutCents } = await calculateCommission(
      booking.property_id,
      booking.total_amount_cents,
      booking.booking_type
    );

    // Guard: check for existing commission before entering transaction
    const existing = await db.queryOne(
      'SELECT id FROM commission_transactions WHERE booking_id = ?',
      [bookingId]
    );
    if (existing) {
      return NextResponse.json(
        { error: 'Commission already recorded for this booking', transactionId: existing.id },
        { status: 409 }
      );
    }

    // Create commission transaction and persist idempotency key inside a transaction
    let transaction: any = null;
    const txOk = await db.transaction(async (tx) => {
      const res = await tx
        .prepare(
          `
        INSERT INTO commission_transactions 
        (booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used,
         commission_amount_cents, platform_fee_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `
        )
        .run(
          bookingId,
          booking.property_id,
          stripeAccountId,
          booking.total_amount_cents,
          rate,
          commissionCents,
          platformFeeCents,
          netPayoutCents,
          booking.currency,
          'pending'
        );

      transaction = await tx
        .prepare('SELECT * FROM commission_transactions WHERE id = $1')
        .get(res.lastInsertRowid);

      // Persist idempotency key inside the same transaction
      if (idempotencyKey) {
        const responsePayload = {
          success: true,
          transaction,
          calculation: {
            rate,
            totalAmountCents: booking.total_amount_cents,
            commissionCents,
            platformFeeCents,
            netPayoutCents,
          },
          message: 'Commission recorded successfully',
        };
        await tx
          .prepare(
            'INSERT OR IGNORE INTO idempotency_keys (key, response, created_at) VALUES ($1, $2, $3)'
          )
          .run(idempotencyKey, JSON.stringify(responsePayload), Math.floor(Date.now() / 1000));
      }
    });

    if (!txOk) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    AuditService.log({
      userId: session.user.id,
      action: 'commission.recorded',
      resource: 'commission_transactions',
      resourceId: transaction?.id?.toString(),
      propertyId: booking.property_id,
      details: { bookingId, rate, commissionCents, netPayoutCents },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        transaction,
        calculation: {
          rate,
          totalAmountCents: booking.total_amount_cents,
          commissionCents,
          platformFeeCents,
          netPayoutCents,
        },
        message: 'Commission recorded successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error('[Commission Create API] Error:', err);
    return errorResponse(err);
  }
}

// PUT /api/payments/commission - Update commission status after transfer
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(req);
    if (isErrorResponse(session)) return session;
    const parsed = commissionPutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const { transactionId, status, stripeTransferId, failureReason } = body;

    if (!transactionId || !status) {
      return NextResponse.json(
        {
          error: 'transactionId and status are required',
        },
        { status: 400 }
      );
    }

    // Verify transaction exists
    const existing = await db
      .prepare(
        `
      SELECT id FROM commission_transactions WHERE id = $1
    `
      )
      .get(transactionId);

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Build update
    const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [status];
    let paramIndex = 2;

    if (stripeTransferId) {
      updates.push(`stripe_transfer_id = $${paramIndex}`);
      params.push(stripeTransferId);
      paramIndex++;
    }

    if (status === 'transferred') {
      updates.push(`transferred_at = CURRENT_TIMESTAMP`);
    }

    if (failureReason) {
      updates.push(`failure_reason = $${paramIndex}`);
      params.push(failureReason);
      paramIndex++;
    }

    params.push(transactionId);

    await db
      .prepare(
        `
      UPDATE commission_transactions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `
      )
      .run(...params);

    const transaction = await db
      .prepare(
        `
      SELECT * FROM commission_transactions WHERE id = $1
    `
      )
      .get(transactionId);

    AuditService.log({
      userId: session.user.id,
      action: `commission.${status}`,
      resource: 'commission_transactions',
      resourceId: transactionId,
      details: { stripeTransferId, failureReason },
    });

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Commission transaction updated',
    });
  } catch (err: any) {
    logger.error('[Commission Update API] Error:', err);
    return errorResponse(err);
  }
}
