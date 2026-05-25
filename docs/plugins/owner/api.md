# Owner Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/owner
```

## Endpoints

### Register Owner
```http
POST /api/owner/register
```
Register a new property owner account. Publicly accessible. Validated via `registerSchema` (Zod).

### Get Current Owner
```http
GET /api/owner/me
```
Retrieve the authenticated owner's profile. Requires authentication.

### Upgrade Plan
```http
POST /api/owner/upgrade
```
Upgrade the owner's subscription plan. Requires authentication and owner role. Validated via `upgradeSchema` (Zod).

## Hooks Emitted

| Event | When |
|-------|------|
| `core:site:plan_upgraded` | After a successful plan upgrade |

Events are emitted via `api.hooks.doAction`.

## Database

This plugin does **not** create dedicated tables — it uses core `user` and property tables.
