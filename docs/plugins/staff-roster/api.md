# Staff Roster Plugin API

> ⚠️ **Plugin-Specific API**

## Base URLs

```
/api/p/staff              — Staff listing
/api/p/staff/roster       — Shift roster management (Hono router)
```

## Endpoints

### List Staff

```http
GET /api/p/staff?listingId=123
```

Returns staff assigned to a property.

**Response:**
```json
{
  "staff": [
    {
      "name": "John Doe",
      "role": "housekeeper",
      "status": "on_duty",
      "email": "john@example.com"
    }
  ]
}
```

### Get Roster Schedule

```http
GET /api/p/staff/roster?start=2024-06-01&end=2024-06-07
```

Returns shifts within the date range.

### Create Shift

```http
POST /api/p/staff/roster/shifts
```

**Request:**
```json
{
  "user_id": "user-123",
  "shift_start": "2024-06-01T08:00:00Z",
  "shift_end": "2024-06-01T16:00:00Z",
  "role": "housekeeper",
  "notes": "Covering for sick colleague"
}
```

## Hooks

This plugin does not emit or listen to any hooks.
