# Accounting Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/accounting
```
Auth: any valid session required.

## Endpoints

### List / Create accounting data
```http
GET /api/p/accounting
POST /api/p/accounting
```

### Revenue Summary
```http
GET /api/p/accounting/summary
```

## Hooks
- `BOOKING_CREATED` — Records a revenue ledger entry for the new booking
