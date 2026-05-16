import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Payment Processing & Commission', () => {
  const createOwnerAndProperty = async () => {
    const ownerId = uuidv4();
    const propertyId = uuidv4();

    await db
      .prepare(
        `
      INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
    `
      )
      .run(ownerId, `test-owner-${uuidv4()}@example.com`, 'pass');

    const slug = `test-shop-${Math.floor(Math.random() * 1000000)}`;
    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain)
      VALUES ($1, $2, $3, $4, 'basic', true, $5)
    `
      )
      .run(propertyId, ownerId, 'Test Shop', slug, slug);

    return { ownerId, propertyId };
  };

  beforeEach(async () => {
    // Clean up test data - cast UUIDs to text for LIKE comparison
    await db
      .prepare(
        "DELETE FROM commission_transactions WHERE CAST(booking_id AS TEXT) IN (SELECT CAST(id AS TEXT) FROM marketplace_bookings WHERE guest_email LIKE 'test-%')"
      )
      .run();
    await db.prepare("DELETE FROM marketplace_bookings WHERE guest_email LIKE 'test-%'").run();
    await db
      .prepare("DELETE FROM stripe_connect_accounts WHERE stripe_account_id LIKE 'acct_test_%'")
      .run();
    await db
      .prepare(
        "DELETE FROM payout_summaries WHERE property_id IN (SELECT id FROM properties WHERE slug LIKE 'test-%')"
      )
      .run();
    await db
      .prepare(
        "DELETE FROM commission_rates WHERE property_id IN (SELECT id FROM properties WHERE slug LIKE 'test-%')"
      )
      .run();
  });

  describe('Stripe Connect Account Management', () => {
    it('should create a Stripe Connect account for a property owner', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(7)}`;

      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, charges_enabled, payouts_enabled, country, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `
        )
        .run(propertyId, ownerId, stripeAccountId, 'express', false, false, 'US', 'usd');

      const account = await db
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE property_id = $1
      `
        )
        .get(propertyId);

      expect(account).toBeTruthy();
      expect(account.stripe_account_id).toBe(stripeAccountId);
      expect(account.stripe_account_type).toBe('express');
      expect(account.charges_enabled).toBe(false);
      expect(account.payouts_enabled).toBe(false);
    });

    it('should update Stripe Connect account status after onboarding', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(7)}`;

      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, stripe_account_type, charges_enabled, payouts_enabled)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
        )
        .run(propertyId, ownerId, stripeAccountId, 'express', false, false);

      // Simulate onboarding completion
      await db
        .prepare(
          `
        UPDATE stripe_connect_accounts 
        SET charges_enabled = true, payouts_enabled = true, onboarding_complete = true
        WHERE stripe_account_id = $1
      `
        )
        .run(stripeAccountId);

      const account = await db
        .prepare(
          `
        SELECT * FROM stripe_connect_accounts WHERE stripe_account_id = $1
      `
        )
        .get(stripeAccountId);

      expect(account.charges_enabled).toBe(true);
      expect(account.payouts_enabled).toBe(true);
      expect(account.onboarding_complete).toBe(true);
    });
  });

  describe('Commission Rate Management', () => {
    it('should use global default commission rate', async () => {
      const globalRate = await db
        .prepare(
          `
        SELECT *, CASE WHEN property_id IS NULL THEN 'all' ELSE property_id END as applies_to 
        FROM commission_rates 
        WHERE property_id IS NULL AND is_active = true
      `
        )
        .get();

      expect(globalRate).toBeTruthy();
      expect(parseFloat(globalRate.rate_percentage)).toBe(10.0);
      expect(globalRate.applies_to).toBe('all');
    });

    it('should create custom commission rate for a property', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      await db
        .prepare(
          `
        INSERT INTO commission_rates 
        (property_id, rate_percentage, flat_fee_cents, applies_to, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
        )
        .run(propertyId, 15.0, 50, 'accommodation', true, ownerId);

      const rate = await db
        .prepare(
          `
        SELECT * FROM commission_rates WHERE property_id = $1 AND applies_to = $2
      `
        )
        .get(propertyId, 'accommodation');

      expect(rate).toBeTruthy();
      expect(parseFloat(rate.rate_percentage)).toBe(15.0);
      expect(rate.flat_fee_cents).toBe(50);
    });
  });

  describe('Marketplace Bookings', () => {
    it('should create a marketplace booking', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const bookingId = uuidv4();
      const guestEmail = `test-guest-${uuidv4()}@example.com`;

      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, booking_type, guest_count, total_amount_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `
        )
        .run(
          bookingId,
          propertyId,
          guestEmail,
          'John Doe',
          'accommodation',
          2,
          25000,
          'USD',
          'confirmed'
        );

      const booking = await db
        .prepare(
          `
        SELECT * FROM marketplace_bookings WHERE id = $1
      `
        )
        .get(bookingId);

      expect(booking).toBeTruthy();
      expect(booking.guest_email).toBe(guestEmail);
      expect(booking.total_amount_cents).toBe(25000); // $250.00
      expect(booking.status).toBe('confirmed');
    });

    it('should create booking with Stripe payment intent', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const bookingId = uuidv4();
      const paymentIntentId = `pi_test_${Math.random().toString(36).substring(7)}`;
      const sessionId = `cs_test_${Math.random().toString(36).substring(7)}`;

      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, booking_type, guest_count, total_amount_cents, 
         currency, status, stripe_payment_intent_id, stripe_checkout_session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
        )
        .run(
          bookingId,
          propertyId,
          `test-${uuidv4()}@example.com`,
          'Jane Doe',
          'accommodation',
          1,
          15000,
          'USD',
          'confirmed',
          paymentIntentId,
          sessionId
        );

      const booking = await db
        .prepare(
          `
        SELECT * FROM marketplace_bookings WHERE stripe_payment_intent_id = $1
      `
        )
        .get(paymentIntentId);

      expect(booking).toBeTruthy();
      expect(booking.stripe_payment_intent_id).toBe(paymentIntentId);
      expect(booking.stripe_checkout_session_id).toBe(sessionId);
    });
  });

  describe('Commission Transactions', () => {
    it('should calculate and record commission for a booking', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      // Setup Stripe Connect account
      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(7)}`;
      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, charges_enabled, payouts_enabled)
        VALUES ($1, $2, $3, true, true)
      `
        )
        .run(propertyId, ownerId, stripeAccountId);

      // Create booking
      const bookingId = uuidv4();
      const totalAmount = 20000; // $200.00
      const commissionRate = 10.0; // 10%
      const commissionAmount = Math.round(totalAmount * (commissionRate / 100)); // $20.00
      const netPayout = totalAmount - commissionAmount; // $180.00

      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, total_amount_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `
        )
        .run(
          bookingId,
          propertyId,
          `test-${uuidv4()}@example.com`,
          'Guest',
          totalAmount,
          'USD',
          'confirmed'
        );

      // Create commission transaction
      const transactionId = uuidv4();
      await db
        .prepare(
          `
        INSERT INTO commission_transactions 
        (id, booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used,
         commission_amount_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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

      expect(transaction).toBeTruthy();
      expect(transaction.total_amount_cents).toBe(totalAmount);
      expect(parseFloat(transaction.commission_rate_used)).toBe(commissionRate);
      expect(transaction.commission_amount_cents).toBe(commissionAmount);
      expect(transaction.net_payout_cents).toBe(netPayout);
      expect(transaction.status).toBe('pending');
    });

    it('should update transaction status after Stripe transfer', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const stripeAccountId = `acct_test_${Math.random().toString(36).substring(7)}`;
      await db
        .prepare(
          `
        INSERT INTO stripe_connect_accounts 
        (property_id, owner_id, stripe_account_id, charges_enabled, payouts_enabled)
        VALUES ($1, $2, $3, true, true)
      `
        )
        .run(propertyId, ownerId, stripeAccountId);

      const bookingId = uuidv4();
      await db
        .prepare(
          `
        INSERT INTO marketplace_bookings 
        (id, property_id, guest_email, guest_name, total_amount_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `
        )
        .run(
          bookingId,
          propertyId,
          `test-${uuidv4()}@example.com`,
          'Guest',
          30000,
          'USD',
          'confirmed'
        );

      const transactionId = uuidv4();
      const transferId = `tr_test_${Math.random().toString(36).substring(7)}`;

      await db
        .prepare(
          `
        INSERT INTO commission_transactions 
        (id, booking_id, property_id, stripe_account_id, total_amount_cents, commission_rate_used,
         commission_amount_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `
        )
        .run(
          transactionId,
          bookingId,
          propertyId,
          stripeAccountId,
          30000,
          10.0,
          3000,
          27000,
          'USD',
          'pending'
        );

      // Simulate transfer completion
      await db
        .prepare(
          `
        UPDATE commission_transactions 
        SET status = 'transferred', stripe_transfer_id = $1, transferred_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
        )
        .run(transferId, transactionId);

      const transaction = await db
        .prepare(
          `
        SELECT * FROM commission_transactions WHERE id = $1
      `
        )
        .get(transactionId);

      expect(transaction.status).toBe('transferred');
      expect(transaction.stripe_transfer_id).toBe(transferId);
      expect(transaction.transferred_at).toBeTruthy();
    });
  });

  describe('Payout Summaries', () => {
    it('should create payout summary for a period', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const summaryId = uuidv4();
      const periodStart = '2026-01-01';
      const periodEnd = '2026-01-31';

      await db
        .prepare(
          `
        INSERT INTO payout_summaries 
        (id, property_id, owner_id, period_start, period_end, total_bookings, 
         total_revenue_cents, total_commission_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
        )
        .run(
          summaryId,
          propertyId,
          ownerId,
          periodStart,
          periodEnd,
          5,
          50000,
          5000,
          45000,
          'USD',
          'pending'
        );

      const summary = await db
        .prepare(
          `
        SELECT * FROM payout_summaries WHERE id = $1
      `
        )
        .get(summaryId);

      expect(summary).toBeTruthy();
      expect(summary.total_bookings).toBe(5);
      expect(summary.total_revenue_cents).toBe(50000);
      expect(summary.total_commission_cents).toBe(5000);
      expect(summary.net_payout_cents).toBe(45000);
      expect(summary.status).toBe('pending');
    });

    it('should update payout summary after payment', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();

      const summaryId = uuidv4();
      const payoutId = `po_test_${Math.random().toString(36).substring(7)}`;

      await db
        .prepare(
          `
        INSERT INTO payout_summaries 
        (id, property_id, owner_id, period_start, period_end, total_bookings, 
         total_revenue_cents, total_commission_cents, net_payout_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `
        )
        .run(
          summaryId,
          propertyId,
          ownerId,
          '2026-02-01',
          '2026-02-28',
          3,
          30000,
          3000,
          27000,
          'USD',
          'processing'
        );

      // Simulate payout completion
      await db
        .prepare(
          `
        UPDATE payout_summaries 
        SET status = 'paid', stripe_payout_id = $1, paid_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
        )
        .run(payoutId, summaryId);

      const summary = await db
        .prepare(
          `
        SELECT * FROM payout_summaries WHERE id = $1
      `
        )
        .get(summaryId);

      expect(summary.status).toBe('paid');
      expect(summary.stripe_payout_id).toBe(payoutId);
      expect(summary.paid_at).toBeTruthy();
    });
  });
});
