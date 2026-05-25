# Authentication API

## Overview

SinaiCamps uses JWT-based authentication managed by Better Auth. Sessions are stored in both cookies (browser clients) and JWT tokens (API clients).

## Authentication Methods

### Cookie-Based Auth (Browser)

Set automatically via `Set-Cookie` headers on login. The session cookie is:
- `better-auth.session_token` (development)
- `__Secure-better-auth.session_token` (production with HTTPS)

### Bearer Token (API Clients)

Include the JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Endpoints

### POST /api/auth/login

Authenticate a user and receive a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "manager-tenant"
  },
  "expiresAt": "2026-01-15T23:59:59Z"
}
```

**Error Responses:**
- `400` — Invalid email format
- `401` — Invalid credentials
- `429` — Too many login attempts (3 req/10s limit)

**Example:**
```bash
curl -X POST https://sinaicamps.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'
```

### POST /api/auth/logout

Invalidate current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{ "success": true, "message": "Logged out successfully" }
```

### GET /api/auth/session

Get current session information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "manager-tenant",
    "name": "John Doe"
  },
  "tenant": {
    "id": "tenant-456",
    "name": "Sunrise Resort",
    "plan": "ultimate"
  },
  "permissions": ["bookings.read", "bookings.write", "staff.read"]
}
```

### GET /api/auth/me

Get current user profile.

**Response (200):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "manager-tenant",
  "createdAt": "2025-06-01T00:00:00Z"
}
```

## Role-Based Access

| Role | Description | API Prefix Access |
|------|-------------|------------------|
| `marketplace_master` | Platform admin | `/api/master/*`, `/api/admin/*` |
| `manager-tenant` | Property manager | `/api/manage/*` |
| `staff` | Staff member | `/api/manage/*` (scoped) |
| `guest` | Guest user | `/api/public/*` |

## Session Expiry

- Default session: 7 days
- With `rememberMe: true`: 30 days
- Sessions are refreshed automatically on each API request within the expiry window.
