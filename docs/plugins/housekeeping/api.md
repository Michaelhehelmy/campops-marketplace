# Housekeeping Plugin API

> ⚠️ **Plugin-Specific API** — These endpoints require the Housekeeping plugin to be enabled.

## Base URL

```
/api/p/housekeeping
```

## Endpoints

### List Tasks

```http
GET /api/p/housekeeping
```

**Query Parameters:**
- `status` — pending, in_progress, completed

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-123",
      "room_id": "room-5",
      "category": "cleaning",
      "status": "pending",
      "priority": "high",
      "assigned_to": null,
      "notes": "Guest checked out at 11am",
      "created_at": "2024-06-15T11:00:00Z"
    }
  ]
}
```

### Update Task Status

```http
PATCH /api/p/housekeeping
```

Updates a task (ID extracted from last URL path segment).

**Request:**
```json
{
  "status": "in_progress",
  "assigned_to": "staff-123"
}
```

## Hooks

The plugin listens to:

- `reservations.after_checkout` — Auto-creates a cleaning task (category='cleaning', priority='high', status='pending')
