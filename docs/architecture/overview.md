# SinaiCamps Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CDN / Cloudflare                      │
│          (Static Assets, DDoS Protection, SSL)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│      (SSL Termination, Rate Limiting, Compression)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Next.js Application                     │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │  App Router  │   API Routes │  Middleware   │         │
│  │  (SSR/SSG)   │   (/api/*)   │ (Auth/I18n)  │         │
│  └──────────────┴──────────────┴──────────────┘         │
│                         │                                │
│              ┌──────────┴──────────┐                    │
│              ▼                     ▼                    │
│      ┌──────────────┐    ┌──────────────┐             │
│      │  Plugin SDK  │◄──►│  Plugin Hooks│             │
│      │  (Register)  │    │   (Events)   │             │
│      └──────────────┘    └──────────────┘             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Data Layer                             │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │   SQLite     │  PostgreSQL  │   Redis*     │         │
│  │  (Dev/Test)  │ (Production) │   (Cache)    │         │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

*Redis is available via ioredis dependency but not yet wired for cache.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | SSR, API routes, middleware |
| **Language** | TypeScript | Type safety throughout |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Data persistence |
| **ORM** | Drizzle ORM | Type-safe queries |
| **Auth** | Better Auth | Session management, RBAC |
| **Plugins** | Plugin Engine + SDK | Modular feature system |
| **Styling** | Tailwind CSS v3 | Utility-first CSS |
| **Cache** | In-memory Map + ioredis | Performance optimization |
| **Payments** | Stripe Connect + Paymob | Payment processing |
| **Infra** | Nginx + PM2 | Reverse proxy, process management |
| **CDN** | Cloudflare | SSL, DDoS, static assets |

## Multi-Tenant Architecture

### Tenant Isolation Model

Each property operates as a tenant within a shared infrastructure:

1. **Database**: Single database, row-level tenant filtering via `property_id` column
2. **Routing**: Tenant resolution via middleware (subdomain/custom domain → property ID)
3. **Plugins**: Per-tenant plugin enable/disable with isolated configuration
4. **Branding**: Per-tenant CSS variables for colors, fonts, logos
5. **Data**: All queries include `property_id = ?` filter — never cross-tenant

### Tenant Resolution Flow

```
HTTP Request → Middleware → Tenant Resolution → Tenant Context → Handler
  hostname       reads        DB query by        x-tenant-*      filters by
  subdomain      headers      subdomain/domain   headers          property_id
```

The middleware sets these headers on every tenant-scoped request:
- `x-tenant-property-id`: Resolved property UUID
- `x-tenant-slug`: Property slug
- `x-tenant-plan`: Current plan
- `x-tenant-name`: Property display name

### Tenant Plans

| Feature | Basic | Premium | Ultimate |
|---------|-------|---------|----------|
| Custom Domain | ❌ | ✅ | ✅ |
| Plugins | 5 max | 15 max | Unlimited |
| Storage | 1GB | 10GB | 100GB |
| Support | Email | Priority | 24/7 Phone |
| API Rate Limit | 30 req/s | 60 req/s | 200 req/s |

## Plugin System

### Plugin Lifecycle

```
Install → Init → Enable → Runtime → Disable → Uninstall
   │        │      │         │         │        │
   ▼        ▼      ▼         ▼         ▼        ▼
 Schema  Tables  Routes      Hooks    Stop    Cleanup
  Check   Seed    UI        Events    API    Remove
```

### Plugin SDK Architecture

```typescript
interface PluginAPI {
  db: {
    createTable(name: string, columns: string): Promise<void>;
    execute(sql: string, params?: any[]): Promise<any>;
    query(sql: string, params?: any[]): Promise<any[]>;
    transaction(fn: (trx: any) => Promise<void>): Promise<void>;
  };
  registerRoute(path: string, handlers: RouteHandlers): void;
  registerHook(event: string, handler: HookHandler): void;
  ui: {
    addSlotComponent(slot: string, componentId: string): void;
  };
  auth: {
    getSession(req?: Request): Promise<Session | null>;
  };
  logger: {
    info(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
  };
}
```

### Hook System Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `BOOKING_CREATED` | New booking created | `{ bookingId, propertyId, guestEmail, ... }` |
| `BOOKING_CANCELLED` | Booking cancelled | `{ bookingId, reason }` |
| `CHECKIN_COMPLETED` | Guest checked in | `{ bookingId, roomId, guestName }` |
| `CHECKOUT_COMPLETED` | Guest checked out | `{ bookingId, roomId }` |
| `PAYMENT_SUCCESS` | Payment completed | `{ bookingId, amount, currency }` |
| `PAYMENT_FAILED` | Payment failed | `{ bookingId, error }` |

### Plugin Discovery

Plugins are auto-discovered from `plugins/*/package.json` on app startup. Each plugin MUST have:
- `plugin.json` — Manifest with metadata, slots, hooks, permissions (required for PluginLoader)
- `package.json` — Node package with `name` matching directory name
- `src/index.ts` — Default export `init(api: PluginAPI)` function

## Database Architecture

### Core Tables

| Table | Purpose | Key Index |
|-------|---------|-----------|
| `users` | Authentication and profiles | `email` |
| `sessions` | Auth sessions | `user_id`, `token` |
| `accounts` | OAuth connections | `user_id` |
| `properties` | Tenant/property data | `owner_id`, `slug`, `is_active` |
| `marketplace_bookings` | Booking records | `property_id`, `guest_email`, `status` |
| `sites` | CMS sites | `owner_id` |
| `posts` | CMS content | `site_id, post_type, post_status` |
| `postmeta` | Post metadata | `post_id` |
| `options` | Site options | `site_id, autoload` |
| `audit_logs` | Security audit trail | `user_id`, `resource`, `created_at` |
| `build_queue` | CMS build jobs | `site_id, status` |

### Plugin Tables

All plugin tables follow the naming convention:
```
plugin_{plugin_id_with_underscores}_{table_name}
```

Example: `plugin_booking_bookings`, `plugin_housekeeping_tasks`

### Migrations

Located in `src/db/migrations/`, numbered sequentially:
```
001_core_posts → 013_add_core_indexes
```

Migration rules:
- Never modify an existing migration
- Always include a `.rollback.sql` file
- Test on staging before production
- Plugin-specific migrations go in `plugins/{id}/migrations/`

## Authentication Flow

```
Browser               Next.js               Better Auth           Database
  │                     │                       │                    │
  │── POST /api/auth/login ──► validate ──► verify ──► SELECT ──► │
  │                     │                       │    user           │
  │                     │                  ┌───┘                    │
  │                     │                  ▼                        │
  │                     │           createSession()                 │
  │                     │                  │                        │
  │◄── Set-Cookie ──────┼──────────────────┘                        │
  │   (JWT + session)   │                  INSERT session           │
  │                     │                       │                    │
  │── GET /api/manage/* ──► middleware ──► verify ──► SELECT ──►  │
  │   (cookie)          │    read cookie      token    session      │
  │◄── 200 OK ──────────┼──────────────────────┘                   │
```

## Performance Architecture

### Caching Layers

| Layer | Data | TTL | Strategy |
|-------|------|-----|----------|
| **In-Memory** | DB query results, computed data | 60s (configurable) | Map-based, lazy expiry + sweep |
| **Nginx Proxy** | Public API responses | 60s | Cache with stale-while-revalidate |
| **CDN** | Static assets (JS, CSS, images) | 365d | Immutable with content hash |
| **Browser** | Static assets | 365d | `Cache-Control: immutable` |

### Database Indexes

21 core indexes across hot query paths (migration 013). Plugin tables should create indexes in their `init()` via `api.db.execute()`.

### Slow Query Monitoring

The `createQueryLogger()` utility wraps `better-sqlite3` prepared statements and logs queries exceeding 200ms.

## Security Architecture

### Defense Layers

1. **Cloudflare**: DDoS protection, WAF, SSL termination
2. **Nginx**: Rate limiting, IP blocking, security headers
3. **Application**: Session validation, role-based access, CSRF protection
4. **API**: Input validation (Zod), parameterized queries
5. **Database**: Parameterized queries prevent SQL injection

### Key Security Measures

- All API routes require authentication via `requireRole`/`requireSession`/`api.auth.getSession()`
- Rate limiting on all API prefixes (30 req/s general, 10 req/s auth)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Permissions-Policy
- Payment endpoints: HMAC verification (Paymob), Stripe signature verification (Stripe), idempotency keys
- Audit logging on all admin actions
- Crash isolation via `unhandledRejection` handler

## Deployment Architecture

### Production Stack

```
Cloudflare (CDN + SSL)
    │
Nginx (reverse proxy, rate limit, cache)
    │
PM2 (process manager)
    │
Next.js (port 3000)
    │
PostgreSQL or SQLite
```

### Environment Configuration

See [Deployment Guide](../deployment/) for full setup instructions.

### Monitoring

- Lighthouse audits via `npm run perf:lighthouse`
- Bundle analysis via `ANALYZE=true npm run build`
- Slow query logging (built-in)
- Error tracking via optional Sentry integration
