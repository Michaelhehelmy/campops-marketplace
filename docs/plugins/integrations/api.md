# Integrations Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/integrations
```

## Endpoints — Calendars

### List Calendars
```http
GET /api/p/integrations/calendars
```
Returns all external calendar connections.

### Create Calendar
```http
POST /api/p/integrations/calendars
```
Register a new external calendar connection.

### Update Calendar
```http
PATCH /api/p/integrations/calendars/:id
```
Update an existing calendar connection.

### Delete Calendar
```http
DELETE /api/p/integrations/calendars/:id
```
Remove a calendar connection.

## Endpoints — Sync

### Trigger Sync
```http
POST /api/p/integrations/sync
```
Trigger a sync operation for calendars.

### Get Sync Status
```http
GET /api/p/integrations/sync
```
Retrieve sync operation status.

## Hooks Consumed

The plugin listens to:
- `BOOKING_CREATED` — triggers calendar sync on new booking
- `BOOKING_CANCELLED` — triggers calendar sync on cancellation
