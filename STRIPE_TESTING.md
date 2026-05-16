# Stripe Sandbox Testing Guide

This guide covers testing the full payment flow using Stripe's test environment.

## Prerequisites

1. **Stripe Account**: Sign up at https://stripe.com (free)
2. **Test API Keys**: Get your test keys from https://dashboard.stripe.com/test/apikeys
   - Secret key: `sk_test_...`
   - Publishable key: `pk_test_...`

## Environment Setup

Set environment variables before running tests:

```bash
export STRIPE_SECRET_KEY_TEST=sk_test_...
export STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
export DATABASE_URL=postgresql://sinaicamps:sinaicamps@localhost:5432/sinaicamps_test
```

## Running Tests

### Mock Mode (Default)

Runs tests with simulated Stripe responses - no actual API calls:

```bash
./scripts/test-stripe-flow.sh
# or
npx vitest run src/lib/__tests__/stripe-sandbox.test.ts
```

### Live Mode (With Real Stripe API)

Runs tests against Stripe's test environment:

```bash
./scripts/test-stripe-flow.sh --live
# or with environment variables set:
npx vitest run src/lib/__tests__/stripe-sandbox.test.ts --reporter=verbose
```

## Test Coverage

| Test                       | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| **Connect Onboarding**     | Creates test Express accounts, generates onboarding URLs              |
| **Payment Intent Flow**    | Creates bookings with PaymentIntent IDs, simulates confirmation       |
| **Commission Calculation** | Verifies 10% commission on $500 booking = $50 commission, $450 payout |
| **Stripe Transfer**        | Records transfer IDs, updates transaction status to `transferred`     |
| **Payout Summary**         | Generates monthly summaries aggregating multiple bookings             |

## Test Data

All test data uses Stripe's test identifiers:

- Account IDs: `acct_test_...`
- Payment Intent IDs: `pi_test_...`
- Transfer IDs: `tr_test_...`
- Checkout Session IDs: `cs_test_...`

## Database Schema Verification

Tests verify these tables work correctly:

- `stripe_connect_accounts` - Linked Stripe accounts per property
- `commission_rates` - Configurable rates (default 10%)
- `marketplace_bookings` - Bookings with Stripe references
- `commission_transactions` - Commission calculations per booking
- `payout_summaries` - Aggregated monthly payouts

## Manual Testing with cURL

### 1. Create a test booking

```bash
curl -X POST http://localhost:3000/api/payments/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "your-property-id",
    "guestEmail": "test@example.com",
    "guestName": "Test Guest",
    "totalAmountCents": 50000,
    "currency": "USD",
    "stripeCheckoutSessionId": "cs_test_..."
  }'
```

### 2. Record commission

```bash
curl -X POST http://localhost:3000/api/payments/commission \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "your-booking-id",
    "stripeAccountId": "acct_test_..."
  }'
```

### 3. Mark as transferred

```bash
curl -X PUT http://localhost:3000/api/payments/commission \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "your-transaction-id",
    "status": "transferred",
    "stripeTransferId": "tr_test_..."
  }'
```

## Expected Commission Flow

For a $500.00 booking with 10% commission:

1. **Guest pays**: $500.00 to Stripe platform account
2. **Commission taken**: $50.00 (10%)
3. **Net payout**: $450.00 transferred to camp's Stripe Connect account
4. **Platform keeps**: $50.00 (minus Stripe fees)

## Troubleshooting

### Tests skip automatically

- Ensure `STRIPE_SECRET_KEY_TEST` starts with `sk_test_`
- Ensure `STRIPE_PUBLISHABLE_KEY_TEST` starts with `pk_test_`

### Database connection errors

- Verify PostgreSQL is running: `pg_isready -h localhost`
- Check DATABASE_URL points to sinaicamps_test database

### 403 Forbidden errors

- Ensure the admin user has `marketplace_master` role in `user_roles` table
