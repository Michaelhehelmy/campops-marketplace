# Financial Operations API

> ⚠️ **Plugin-Specific API**

## Base URLs

### Management route
```
GET /api/manage/:listingId/finance
```
Roles: `master`, `admin`, `marketplace_master`

### Billing routes
```
GET  /api/p/finance/billing/folios/:id
POST /api/p/finance/billing/payments
```
No auth middleware (relies on session).

### Commissions route
```
GET /api/p/finance/commissions
```
Roles: `master`, `admin`, `staff`

## Endpoints

### Get Folio
```http
GET /api/p/finance/billing/folios/:id
```

### Apply Payment
```http
POST /api/p/finance/billing/payments
```

### List Commissions
```http
GET /api/p/finance/commissions
```

### Management Finance View
```http
GET /api/manage/:listingId/finance
```

## Hooks
- `BOOKING_CREATED` — Automatically creates a 10% commission entry
