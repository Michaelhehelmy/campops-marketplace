# Guest CRM Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/crm
```

## Endpoints

### List Guests
```http
GET /api/p/crm/guests
```
Returns guest profiles with preferences and history. Requires any authenticated session.

### List Segments
```http
GET /api/p/crm/segments
```
Returns defined guest segments. Requires any authenticated session.

### Guests by Listing
```http
GET /api/p/crm/guests-by-listing
```
Returns guests grouped by listing.

### Stats
```http
GET /api/p/crm/stats
```
Returns CRM aggregate statistics.

## Hooks

The plugin listens to `reservations.after_create` to update guest profiles automatically.

## Tables

This plugin does **not** create its own tables. It reads from core `users` and `reservations` tables.
