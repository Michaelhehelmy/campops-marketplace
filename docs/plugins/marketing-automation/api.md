# Marketing Automation API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/marketing
```
Auth: any valid session required.

## Endpoints

### Manage Campaigns
```http
GET  /api/p/marketing?section=campaigns
POST /api/p/marketing?section=campaigns
```

### Manage Segments
```http
GET  /api/p/marketing?section=segments
POST /api/p/marketing?section=segments
```

### Manage Automation Triggers
```http
GET  /api/p/marketing?section=triggers
POST /api/p/marketing?section=triggers
```

## Hooks
- `BOOKING_CREATED` — Checks for active triggers matching the `booking.created` event
