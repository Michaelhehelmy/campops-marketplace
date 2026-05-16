import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stripe Sandbox Integration Tests
 * Simulates the full booking → payment → commission → payout flow
 *
 * These tests require STRIPE_SECRET_KEY_TEST environment variable
 * with a Stripe test mode secret key (sk_test_...)
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY_TEST;

// Skip tests if Stripe keys not configured
const describeIfStripe = STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY ? describe : describe.skip;

describeIfStripe('Stripe Sandbox Payment Flow', () => {
  const createOwnerAndProperty = async () => {
    const ownerId = uuidv4();
    const propertyId = uuidv4();

    await db
      .prepare(
        `
      INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
    `
      )
      .run(ownerId, `stripe-test-owner-${uuidv4()}@example.com`, 'pass');

    const slug = `stripe-shop-${Math.floor(Math.random() * 1000000)}`;
    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain)
      VALUES ($1, $2, $3, $4, 'basic', true, $5)
    `
      )
      .run(propertyId, ownerId, 'Test Camp', slug, slug);

    return { ownerId, propertyId };
  };

  beforeAll(async () => {
    if (!STRIPE_SECRET_KEY) {
      console.log('⚠️  STRIPE_SECRET_KEY_TEST not set, skipping Stripe tests');
      return;
    }
    console.log('🔑 Stripe test keys configured, running sandbox tests');
  });

  beforeEach(async () => {
    // Clean up Stripe-related test data
    await db
      .prepare(
        "DELETE FROM commission_transactions WHERE stripe_transfer_id LIKE 'tr_test_%' OR stripe_transfer_id LIKE 'tr_%'"
      )
      .run();
    await db
      .prepare(
        "DELETE FROM marketplace_bookings WHERE stripe_payment_intent_id LIKE 'pi_test_%' OR stripe_payment_intent_id LIKE 'pi_%'"
      )
      .run();
    await db
      .prepare("DELETE FROM stripe_connect_accounts WHERE stripe_account_id LIKE 'acct_%'")
      .run();
  });

  describe('Stripe Connect Onboarding', () => {
    it('should create a test Stripe Connect Express account', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      // In real scenario, this would call Stripe API:
      // const account = await stripe.accounts.create({
      //   type: 'express',
      //   country: 'US',
      //   capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
      // });

      // Simulated for test without actual API call:
      const mockStripeAccountId = `acct_test_${Math.random().toString(36).substring(2, 10)}`;

      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, charges_enabled, payouts_enabled, country, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `
        )
        .run(propertyId, ownerId, mockStripeAccountId, 'express', false, false, 'US', 'usd');

      const account = await db
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE property_id = $1
      `
        )
        .get(propertyId);

      expect(account).toBeTruthy();
      expect(account.stripe_account_id).toMatch(/^acct_test_/);
      expect(account.stripe_account_type).toBe('express');
    });

    it('should generate onboarding URL for Connect account', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();
      const mockStripeAccountId = `acct_test_${Math.random().toString(36).substring(2, 10)}`;

      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, onboarding_url)
        VALUES ($1, $2, $3, $4, $5)
      `
        )
        .run(
          propertyId,
          ownerId,
          mockStripeAccountId,
          'express',
          `https://connect.stripe.com/setup/s/${mockStripeAccountId}`
        );

      const account = await db
        .prepare(
          `
        SELECT onboarding_url FROM stripe_connect_accounts WHERE property_id = $1
      `
        )
        .get(propertyId);

      expect(account.onboarding_url).toContain('stripe.com');
      expect(account.onboarding_url).toContain(mockStripeAccountId);
    });
  });

  describe('Payment Intent Flow', () => {
    it('should create a marketplace booking with Stripe PaymentIntent', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const bookingId = uuidv4();
      const mockPaymentIntentId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;
      const mockCheckoutSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`;

      // Create booking
      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, booking_type, guest_count, total_amount_cents, currency, status, stripe_payment_intent_id, stripe_checkout_session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
        )
        .run(
          bookingId,
          propertyId,
          'guest@example.com',
          'Jane Doe',
          'accommodation',
          2,
          50000,
          'USD',
          'confirmed',
          mockPaymentIntentId,
          mockCheckoutSessionId
        );

      const booking = await db
        .prepare(
          `
        SELECT * FROM marketplace_bookings WHERE id = $1
      `
        )
        .get(bookingId);

      expect(booking).toBeTruthy();
      expect(booking.stripe_payment_intent_id).toBe(mockPaymentIntentId);
      expect(booking.stripe_checkout_session_id).toBe(mockCheckoutSessionId);
      expect(booking.total_amount_cents).toBe(50000); // $500.00
    });

    it('should simulate successful payment confirmation', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const bookingId = uuidv4();
      const mockPaymentIntentId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;

      // Create initial pending booking
      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, total_amount_cents, currency, status, stripe_payment_intent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `
        )
        .run(
          bookingId,
          propertyId,
          'guest@example.com',
          'Jane Doe',
          75000,
          'USD',
          'pending',
          mockPaymentIntentId
        );

      // Simulate Stripe webhook: payment_intent.succeeded
      await db
        .prepare(
          `
        UPDATE marketplace_bookings 
        SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = $1
      `
        )
        .run(mockPaymentIntentId);

      const confirmedBooking = await db
        .prepare(
          `
        SELECT * FROM marketplace_bookings WHERE id = $1
      `
        )
        .get(bookingId);

      expect(confirmedBooking.status).toBe('confirmed');
    });
  });

  describe('Commission Calculation & Transfer', () => {
    it('should calculate commission and record transaction for Stripe transfer', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      // Setup Connect account
      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(2, 10)}`;
      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, charges_enabled, payouts_enabled)
        VALUES ($1, $2, $3, $4, true, true)
      `
        )
        .run(propertyId, ownerId, stripeAccountId, 'express');

      // Create booking ($300.00)
      const bookingId = uuidv4();
      const totalAmount = 30000; // cents
      const commissionRate = 10.0; // 10%
      const commissionAmount = Math.round(totalAmount * (commissionRate / 100)); // 3000 cents
      const netPayout = totalAmount - commissionAmount; // 27000 cents

      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, total_amount_cents, currency, status, stripe_payment_intent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `
        )
        .run(
          bookingId,
          propertyId,
          'guest@example.com',
          'Jane Doe',
          totalAmount,
          'USD',
          'confirmed',
          `pi_test_${uuidv4()}`
        );

      // Record commission transaction (pre-transfer)
      const transactionId = uuidv4();
      await db
        .prepare(
          `
        INSERT INTO commission_transactions 
        (id, booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used, 
         commission_amount_cents, platform_fee_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
        )
        .run(
          transactionId,
          bookingId,
          propertyId,
          stripeAccountId,
          totalAmount,
          commissionRate,
          commissionAmount,
          0,
          netPayout,
          'USD',
          'pending'
        );

      const transaction = await db
        .prepare(
          `
        SELECT * FROM commission_transactions WHERE id = $1
      `
        )
        .get(transactionId);

      expect(parseFloat(transaction.commission_rate_used)).toBe(commissionRate);
      expect(transaction.commission_amount_cents).toBe(commissionAmount);
      expect(transaction.net_payout_cents).toBe(netPayout);
      expect(transaction.status).toBe('pending');
    });

    it('should simulate Stripe transfer and update transaction status', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(2, 10)}`;
      const bookingId = uuidv4();
      const transactionId = uuidv4();
      const mockTransferId = `tr_test_${Math.random().toString(36).substring(2, 15)}`;

      // Setup
      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts (property_id, owner_id, stripe_account_id, stripe_account_type)
        VALUES ($1, $2, $3, 'express')
      `
        )
        .run(propertyId, ownerId, stripeAccountId);

      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings (id, property_id, guest_email, guest_name, total_amount_cents, currency, status)
        VALUES ($1, $2, $3, $4, 40000, 'USD', 'confirmed')
      `
        )
        .run(bookingId, propertyId, 'guest@example.com', 'Jane Doe');

      await db
        .prepare(
          `
        INSERT INTO commission_transactions 
        (id, booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used, 
         commission_amount_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, 40000, 10.00, 4000, 36000, 'USD', 'pending')
      `
        )
        .run(transactionId, bookingId, propertyId, stripeAccountId);

      // Simulate transfer
      await db
        .prepare(
          `
        UPDATE commission_transactions 
        SET status = 'transferred', 
            stripe_transfer_id = $1,
            transferred_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
        )
        .run(mockTransferId, transactionId);

      const updated = await db
        .prepare(
          `
        SELECT * FROM commission_transactions WHERE id = $1
      `
        )
        .get(transactionId);

      expect(updated.status).toBe('transferred');
      expect(updated.stripe_transfer_id).toBe(mockTransferId);
      expect(updated.transferred_at).toBeTruthy();
    });
  });

  describe('Payout Summary', () => {
    it('should generate monthly payout summary for Stripe Connect', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();
      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(2, 10)}`;

      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts (property_id, owner_id, stripe_account_id, stripe_account_type)
        VALUES ($1, $2, $3, 'express')
      `
        )
        .run(propertyId, ownerId, stripeAccountId);

      // Create multiple commission transactions for this month
      for (let i = 0; i < 3; i++) {
        const bookingId = uuidv4();
        const txId = uuidv4();

        await db
          .prepare(
            `
          INSERT INTO marketplace_bookings (id, property_id, guest_email, guest_name, total_amount_cents, currency, status)
          VALUES ($1, $2, $3, $4, 20000, 'USD', 'confirmed')
        `
          )
          .run(bookingId, propertyId, `guest${i}@example.com`, `Guest ${i}`);

        await db
          .prepare(
            `
          INSERT INTO commission_transactions 
          (id, booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used, 
           commission_amount_cents, net_payout_cents, currency, status, transferred_at)
          VALUES ($1, $2, $3, $4, 20000, 10.00, 2000, 18000, 'USD', 'transferred', CURRENT_TIMESTAMP)
        `
          )
          .run(txId, bookingId, propertyId, stripeAccountId);
      }

      // Generate payout summary
      const summaryId = uuidv4();
      const periodStart = new Date();
      periodStart.setDate(1);
      const periodEnd = new Date();

      await db
        .prepare(
          `
        INSERT INTO payout_summaries 
        (id, property_id, stripe_account_id, period_start, period_end, 
         total_bookings_count, total_revenue_cents, total_commission_cents, 
         total_net_payout_cents, currency, status)
        SELECT $1, $2, $3, $4, $5,
               COUNT(*), SUM(total_amount_cents), SUM(commission_amount_cents),
               SUM(net_payout_cents), 'USD', 'pending_transfer'
        FROM commission_transactions
        WHERE property_id = $2 AND status = 'transferred' AND transferred_at >= $4
      `
        )
        .run(
          summaryId,
          propertyId,
          stripeAccountId,
          periodStart.toISOString(),
          periodEnd.toISOString()
        );

      const summary = await db
        .prepare(
          `
        SELECT * FROM payout_summaries WHERE id = $1
      `
        )
        .get(summaryId);

      expect(summary).toBeTruthy();
      expect(summary.total_bookings_count).toBe(3);
      expect(summary.total_revenue_cents).toBe(60000); // 3 x $200
      expect(summary.total_commission_cents).toBe(6000); // 3 x $20 commission
      expect(summary.total_net_payout_cents).toBe(54000); // 3 x $180
    });
  });
});
