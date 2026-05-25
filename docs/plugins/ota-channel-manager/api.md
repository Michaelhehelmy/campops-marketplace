# OTA Channel Manager API

> ⚠️ **Plugin-Specific API**

## Base URL

```
/api/p/ota
```

## Endpoints

### List External Calendars

```http
GET /api/p/ota/calendars
```

**Query Parameters:**
- `roomId` — Filter by room ID

**Response:**
```json
{
  "calendars": [
    {
      "id": "cal-1",
      "room_id": "room-1",
      "name": "Airbnb",
      "url": "https://ics.airbnb.com/..."
    }
  ]
}
```

### Create External Calendar

```http
POST /api/p/ota/calendars
```

**Request:**
```json
{
  "room_id": "room-1",
  "name": "Airbnb",
  "url": "https://ics.airbnb.com/..."
}
```

### List Booking Conflicts

```http
GET /api/p/ota/conflicts
```

Returns reservations with `status = 'conflict_pending'`.

## Hooks

The plugin registers a listener for:

- `cron.hourly` — Triggers OTA sync (currently a stub that logs "Triggering hourly OTA sync")
