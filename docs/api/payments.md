# Payments API

## Overview

Payment processing is handled through Stripe Connect and the Paymob plugin. The platform supports:

- **Stripe Connect**: Marketplace commission model (platform collects, splits to owners)
- **Paymob**: Direct payment gateway for specific regions
- **Idempotency**: All payment endpoints support idempotency keys to prevent duplicate charges

## Idempotency

All payment mutation endpoints support idempotency via the `Idempotency-Key` header:

```
Idempotency-Key: unique-key-per-request
```

If the same key is sent within the idempotency window, the cached response is returned without processing.

## Stripe Connect

### POST /api/payments/connect

Create a Stripe Connect account for a property owner.

**Required Role:** `manager-tenant`

**Request Body:**
```json
{
  "propertyId": "prop-1",
  "country": "US",
  "email": "owner@example.com"
}
```

**Response (201):**
```json
{
  "accountId": "acct_123",
  "onboardingUrl": "https://connect.stripe.com/setup/..."
}
```

### POST /api/payments/connect/webhook

Stripe Connect webhook endpoint. Handles `account.updated`, `payout.paid`, etc.

No authentication (verified via Stripe signature).

### GET /api/payments/connect/:accountId/status

Check Connect account onboarding status.

### POST /api/payments/commission/calculate

Calculate commission for a given booking.

**Request Body:**
```json
{
  "bookingId": "booking-1",
  "amountCents": 15000,
  "propertyId": "prop-1"
}
```

### POST /api/payments/commission

Create a commission transaction.

**Required Role:** `marketplace_master`

**Request Body:**
```json
{
  "bookingId": "booking-1",
  "propertyId": "prop-1",
  "totalAmountCents": 15000,
  "commissionRate": 10.0
}
```

## Stripe Checkout

### POST /api/checkout/create

Create a Stripe Checkout session.

**Required Role:** `guest` (or unauthenticated for public bookings)

**Request Body:**
```json
{
  "propertyId": "prop-1",
  "roomTypeId": "room-type-1",
  "checkIn": "2026-06-01",
  "checkOut": "2026-06-05",
  "guestName": "John Doe",
  "guestEmail": "guest@example.com",
  "guestCount": 2,
  "currency": "USD"
}
```

### POST /api/checkout/webhook

Stripe webhook for checkout session completion. Creates booking on `checkout.session.completed`.

No authentication (verified via Stripe signature).

## Payouts

### GET /api/payments/payouts

List payout summaries for a property.

**Required Role:** `manager-tenant`

**Query Parameters:** `propertyId` (required), `limit`, `offset`

### POST /api/payments/payouts/pay

Trigger a manual payout.

**Required Role:** `marketplace_master`

## Paymob Plugin

The Paymob plugin provides alternative payment processing. See [Paymob Plugin docs](../plugins/paymob/) for details.

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| IDEMPOTENCY_MISMATCH | 422 | Idempotency key exists with different request |
| STRIPE_ERROR | 502 | Upstream Stripe API error |
| INSUFFICIENT_FUNDS | 400 | Owner payout account has insufficient funds |
| CONNECT_ACCOUNT_MISSING | 400 | Property has no Stripe Connect account |
