# CRM Plugin API

> ⚠️ **Plugin-Specific API** — These endpoints require the CRM plugin to be enabled.

## Base URL

```
/api/p/crm
```

## Endpoints

### List Activities

```http
GET /api/p/crm/activities
```

Returns guest activities with role-based filtering. Guests see only their own activities; managers/admins see all.

**Query Parameters:**
- `guest_email` — (Manager+) Filter by specific guest email

**Response:**
```json
{
  "activities": [
    {
      "id": "1",
      "guest_email": "john@example.com",
      "activity_type": "BOOKING_CREATED",
      "details": "{\"totalPrice\":500}",
      "severity": "info",
      "created_at": "2024-06-15T10:30:00Z"
    }
  ]
}
```

## Hooks

The plugin listens to:

- `BOOKING_CREATED` — Logs a new activity record in `plugin_crm_activities` with `activity_type = 'BOOKING_CREATED'`
