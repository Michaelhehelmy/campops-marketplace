# Subscriptions Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/subscriptions
```
Auth: any valid session required.

## Endpoints

### Manage Plans
```http
GET  /api/p/subscriptions?section=plans
POST /api/p/subscriptions?section=plans
```

### Manage Subscriptions
```http
GET  /api/p/subscriptions?section=subscriptions
POST /api/p/subscriptions?section=subscriptions
```

### Revenue View
```http
GET /api/p/subscriptions?section=revenue
```

## Hooks
- `BOOKING_CREATED` — Checks subscription eligibility for the guest
