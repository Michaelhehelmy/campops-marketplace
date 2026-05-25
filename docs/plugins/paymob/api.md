# Paymob Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/paymob
```

## Endpoints

### Create Payment
```http
POST /api/p/paymob/create-payment
```
Initiates a payment with the Paymob gateway. No authentication required.

### Webhook
```http
POST /api/p/paymob/webhook
```
Receives Paymob transaction callbacks with HMAC verification for security.

### Return
```http
GET /api/p/paymob/return
```
Handles the customer redirect after payment completion. No authentication required.

## Hooks

The plugin listens to:
- `payment.collect_methods` — provides available Paymob payment methods
- `payment.on_success` — handles post-payment success actions

## Database

Creates `plugin_paymob_transactions` table (conditionally) to store transaction records.
