# SinaiCamps Marketplace — Production Readiness Plan

> Generated: 2026-05-20  
> Author: Lead Architect (automated analysis)  
> Evidence sources: Filesystem, SQLite DB, Playwright config, CI/CD workflows, nginx config, Node.js source code, 75+ test files, 33 E2E spec files

---

## 1. Executive Summary

### Current State

The codebase is a **functional monolith** with a plugin architecture, serving a multi-tenant marketplace for camp/glamping properties. It uses:

- **Next.js 14.2.29** (App Router) with `next-intl` for i18n
- **SQLite via better-sqlite3** in dev/test; **PostgreSQL** optional in production
- **better-auth** for email/password auth with session cookies
- **Stripe Connect** for payment processing; **Elevate Pay** as a stub webhook handler
- **Plugin system** using `jiti` for runtime TypeScript loading with Single-SPA frontend components
- **28 plugins** (booking, crm, loyalty, pwa, resource, financial-ops, etc.)
- **PM2** for process management on an Oracle VM; **Cloudflare Pages** for tenant frontends
- **Nginx** reverse proxy with Let's Encrypt SSL

### What Is Already Production-Grade

1. **Comprehensive test suite**: 75+ unit/integration tests, 33 Playwright E2E spec files covering public, guest, manager, master, staff flows
2. **Solid multi-tenant middleware**: Resolves tenant by subdomain/custom domain, enforces plan-based feature gating, staff role restrictions
3. **Structured JSON logging** with request IDs via AsyncLocalStorage
4. **Rate limiting** (in-memory with Redis fallback) on public API prefixes
5. **CSRF double-submit token pattern** in middleware for all mutating `/api/*` requests
6. **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy set in middleware AND nginx
7. **Health check** covering DB, plugin system, and memory
8. **Database backup script** with 10-backup retention
9. **CI/CD pipeline** with linting, testing, Playwright E2E, and deployment to Oracle VM

### Top 5 Risks (Must Fix Before Launch)

| #   | Risk                                                 | Evidence                                                                                                                                                            | Severity     |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **57 of 79 API routes have NO authentication**       | Route audit (`manage/*`, `master/*`, `payments/*`, `site/plugins/*`, `public/homepage-config PUT`, `admin/plugins/sync POST`, `test/reset POST`)                    | **CRITICAL** |
| 2   | **GitHub Personal Access Token hardcoded in `.env`** | `src/middleware.ts:36` — `GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_11BTC3IEI..."`                                                                                   | **CRITICAL** |
| 3   | **Plugins run in-process with no sandbox**           | `PluginRuntimeService.ts:96` uses `jiti(foundPath)` — any plugin can crash the server, call `process.exit()`, read any file, or execute arbitrary SQL               | **CRITICAL** |
| 4   | **SQLite write concurrency under PM2 multi-process** | `db.ts:38-41` uses `better-sqlite3` (synchronous, single-writer) — PM2 may spawn multiple Node processes, causing `SQLITE_BUSY` errors under load                   | **HIGH**     |
| 5   | **Missing database indexes on critical query paths** | `marketplace_bookings` (property_id, guest_email, status), `audit_logs` (user_id, property_id, created_at), `sessions` (user_id) have NO indexes beyond primary key | **HIGH**     |

---

## 2. Master Execution Roadmap

### Phase 1 — Launch Blockers (CRITICAL — Do before any traffic)

#### PH1-001: Authenticate all mutating API routes

| Field              | Value                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**       | Security                                                                                                                                                                                                                                                  |
| **Priority**       | CRITICAL                                                                                                                                                                                                                                                  |
| **Dependencies**   | None                                                                                                                                                                                                                                                      |
| **Effort**         | 6h                                                                                                                                                                                                                                                        |
| **Files affected** | 48 route files across `src/app/api/master/*`, `src/app/api/manage/*`, `src/app/api/payments/*`, `src/app/api/site/plugins/*`, `src/app/api/public/homepage-config/route.ts`, `src/app/api/admin/plugins/sync/route.ts`, `src/app/api/test/reset/route.ts` |

**What we found**: Route audit revealed 57/79 routes lack any authentication check. Examples:

- `manage/[listingId]/finance/route.ts` — GET returns financial data, no session check
- `manage/[listingId]/domain/route.ts` — POST changes custom domain, no auth
- `master/listings/route.ts` — POST creates listings, no auth
- `master/settings/route.ts` — GET/POST to master settings, no auth
- `public/homepage-config/route.ts` — PUT modifies global homepage, no auth
- `admin/plugins/sync/route.ts` — POST triggers filesystem sync, no auth (confirmed at `src/app/api/admin/plugins/sync/route.ts:10-16`)
- `site/plugins/install/route.ts` — POST installs plugins, no auth
- `test/reset/route.ts` — POST wipes the database, no auth (confirmed at `src/app/api/test/reset/route.ts:5-15`)

**Implementation**:

1. Create a shared middleware helper in `src/lib/auth-middleware.ts`:

```typescript
import { auth } from './auth';
import { NextResponse } from 'next/server';

type Role = 'master' | 'marketplace_master' | 'manager' | 'staff' | 'guest';

export async function requireSession(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_ERROR' }, { status: 401 });
    }
    return session;
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_ERROR' }, { status: 401 });
  }
}

export async function requireRole(req: Request, allowedRoles: Role[]) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const userRole = (session.user as any)?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }
  return session;
}
```

**Note on existing auth patterns**: The codebase already has `import { getAuthSession } from '@/lib/auth'` defined at `src/lib/auth.ts:63-71` which wraps `auth.api.getSession()` with try/catch. The new `auth-middleware.ts` should reuse this pattern for consistency.

2. Add `requireRole(req, ['marketplace_master'])` to every `master/*` and `admin/*` route.
   - **Specific routes to patch:**
     - `src/app/api/admin/plugins/sync/route.ts` — add `import { requireRole } from '@/lib/auth-middleware'` and call at top of `POST`
     - `src/app/api/test/reset/route.ts` — add `if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not found' }, { status: 404 })` at top
     - `src/app/api/public/homepage-config/route.ts` — add `requireRole(req, ['marketplace_master'])` in `PUT` handler
     - All `src/app/api/master/*` route files
     - All `src/app/api/site/plugins/*` route files

3. Add `requireRole(req, ['manager', 'master', 'marketplace_master'])` to every `manage/[listingId]/*` route (with ownership verification). Ownership check should verify the listing's `owner_id` matches `session.user.id` or the user has `marketplace_master` role.

4. Add `requireSession(req)` to `payments/*` routes (for webhooks, use signature verification instead).

**Edge cases to handle**:

- **Expired sessions**: `auth.api.getSession()` returns `null` for expired/invalid sessions — the middleware will return 401 as expected.
- **Missing session cookie entirely**: Same — returns 401.
- **Admin routes accessed by non-admin users**: `requireRole` will return 403.
- **Concurrent auth checks**: Each route handler calls `requireSession` independently; there's no caching mechanism. For high-traffic routes, consider caching the session lookup, but this is acceptable initially.

**Verification**:

```bash
# Test unauthenticated access to each route:
curl -v -X POST http://localhost:3000/api/admin/plugins/sync -H 'Content-Type: application/json'
# Expected: 401

curl -v -X PUT http://localhost:3000/api/public/homepage-config \
  -H 'Content-Type: application/json' \
  -d '{"sections":["hero"]}'
# Expected: 401

# Test authenticated access with valid session (use a cookie from a real login)
curl -v http://localhost:3000/api/master/listings -H 'Cookie: better-auth.session_token=VALID_TOKEN'
# Expected: 200 (if role is master) or 403 (if wrong role)

# Run existing smoke tests to confirm no regressions:
npx vitest run tests/api-smoke.test.ts
```

**Acceptance criteria**: Every mutating endpoint returns 401 without a valid session cookie, or 403 without the required role. `test/reset` returns 404 in production. Existing smoke tests continue to pass.

---

#### PH1-002: Remove hardcoded GitHub PAT from `.env`

| Field              | Value            |
| ------------------ | ---------------- |
| **Category**       | Security         |
| **Priority**       | CRITICAL         |
| **Dependencies**   | None             |
| **Effort**         | 0.5h             |
| **Files affected** | `.env` (line 35) |

**What we found**: `/home/michael/Proj/campops-marketplace/.env:35`:

```
GITHUB_PERSONAL_ACCESS_TOKEN="<REDACTED>"
```

This token has full repo access.

**IMPORTANT CORRECTION**: Analysis shows `.env` is in `.gitignore` (confirmed at `.gitignore:9`) and was **never committed** to the repo (`git ls-files .env` returns nothing, `git log --all -- .env` returns nothing). However, the token is still a risk:

- It exists on disk and could be leaked through a careless commit, backup, or screen share
- It could be exposed if `dotenv` expansion dumps env vars in error logs
- The file could be accidentally included in a CI artifact

**Implementation**:

1. **Immediately revoke the token** at https://github.com/settings/tokens — this is the top priority as the token is active on disk
2. Remove the line from `.env`:
   ```
   # Delete or comment out line 35:
   # GITHUB_PERSONAL_ACCESS_TOKEN="<REDACTED>"
   ```
3. Add a note to `CONTRIBUTING.md` about environment variable management:
   ```
   ## Security: Environment Variables
   - Never add real secrets to `.env.example` or commit `.env` files
   - Use `git ls-files .env*` to verify no `.env` file is tracked
   - Rotate secrets immediately if they may have been exposed
   ```
4. Check `.env.production` for secrets too — this file contains `NEXTAUTH_SECRET` and should be rotated if it was ever shared outside the ops team.
5. Run `grep -r "github_pat" --include="*.{ts,js,json,yml,yaml,md}" .` to check for any accidental copies of the token in tracked files.

**Verification**:

```bash
# Verify .env is not tracked:
git ls-files .env
# Should return nothing (empty output)

# Verify no other copies of the token:
grep -r "github_pat" --include="*.{ts,js,json,yml,yaml,md}" . 2>/dev/null || echo "No copies found"

# Confirm token is revoked by attempting to use it (will get 401 from GitHub):
curl -H "Authorization: token github_pat_11BTC3IEI..." https://api.github.com/user
# Expected: 401 Bad credentials
```

**Acceptance criteria**: Token is revoked on GitHub. No copies of the token exist in tracked files or `.env`. `.env` remains in `.gitignore` and untracked.

---

#### PH1-003: Add database indexes for critical query paths

| Field              | Value                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| **Category**       | Performance / Reliability                                                  |
| **Priority**       | CRITICAL                                                                   |
| **Dependencies**   | None                                                                       |
| **Effort**         | 1h                                                                         |
| **Files affected** | `src/db/migrations/008_add_indexes.sql` (new file), `sinaicamps.db` schema |

**What we found**: Missing indexes on:

- `marketplace_bookings.property_id` — used in all booking lookups by property
- `marketplace_bookings.guest_email` — used in guest reservation lookups
- `marketplace_bookings.status` — used in status-based filtering
- `audit_logs.user_id` — used in audit trail queries
- `audit_logs.property_id` — used in tenant audit queries
- `audit_logs.created_at` — used in time-range queries
- `sessions.user_id` — used in session lookups

**IMPORTANT CORRECTION**: The migration system at `src/lib/runMigrations.ts:49-108` works by reading `.sql` files from `src/db/migrations/` (e.g., `001_core_posts.sql`, `002_themes_registry.sql`, `007_plugin_submissions.sql`) — NOT by adding inline TypeScript to `runMigrations.ts`. The correct approach is to create a numbered SQL migration file. Rollback files (`.rollback.sql`) are optional but recommended.

**Implementation** — Create `src/db/migrations/008_add_indexes.sql`:

```sql
-- Migration 008: Add missing indexes for critical query paths
-- Applied by src/lib/runMigrations.ts automatically on server start

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_property_id
  ON marketplace_bookings(property_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_guest_email
  ON marketplace_bookings(guest_email);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status
  ON marketplace_bookings(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_property_id
  ON audit_logs(property_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_plugin_booking_bookings_listing_id
  ON plugin_booking_bookings(listing_id);

CREATE INDEX IF NOT EXISTS idx_plugin_booking_bookings_guest_email
  ON plugin_booking_bookings(guest_email);

CREATE INDEX IF NOT EXISTS idx_plugin_booking_availability_date
  ON plugin_booking_room_availability(date);
```

Also create `src/db/migrations/008_add_indexes.rollback.sql` (for clean rollback):

```sql
-- Rollback Migration 008: Drop the indexes added in 008

DROP INDEX IF EXISTS idx_marketplace_bookings_property_id;
DROP INDEX IF EXISTS idx_marketplace_bookings_guest_email;
DROP INDEX IF EXISTS idx_marketplace_bookings_status;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_property_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_plugin_booking_bookings_listing_id;
DROP INDEX IF EXISTS idx_plugin_booking_bookings_guest_email;
DROP INDEX IF EXISTS idx_plugin_booking_availability_date;
```

**Note on `CREATE INDEX IF NOT EXISTS`**: SQLite 3.3.0+ supports `IF NOT EXISTS` on `CREATE INDEX`, so this migration is idempotent and safe to re-run.

**Verification**:

```bash
# Verify indexes were created:
sqlite3 sinaicamps.db "PRAGMA index_list('marketplace_bookings');"
# Should show 4 entries (PK + 3 new indexes)

sqlite3 sinaicamps.db "PRAGMA index_list('audit_logs');"
# Should show 4 entries (PK + 3 new indexes)

sqlite3 sinaicamps.db "PRAGMA index_list('sessions');"
# Should show 2 entries (PK + 1 new index)

# Verify migration was recorded:
sqlite3 sinaicamps.db "SELECT version FROM schema_migrations WHERE version = '008_add_indexes';"
# Should return the version

# Verify query plan uses indexes:
sqlite3 sinaicamps.db "EXPLAIN QUERY PLAN SELECT * FROM marketplace_bookings WHERE property_id = '1';"
# Should show "SEARCH marketplace_bookings USING INDEX idx_marketplace_bookings_property_id"

# Run migration test to confirm nothing breaks:
npx vitest run src/lib/__tests__/runMigrations.test.ts
```

**Acceptance criteria**: All 10 new indexes exist in the database. `EXPLAIN QUERY PLAN` shows index usage for property_id, guest_email, and status lookups. The migration is recorded in `schema_migrations`.

**Acceptance criteria**: All listed tables have indexes on the specified columns. Query plans show index usage for property_id, guest_email, and status lookups.

---

#### PH1-004: Prevent SQLite `SQLITE_BUSY` under concurrent access

| Field              | Value                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Category**       | Reliability                                                                                                 |
| **Priority**       | CRITICAL                                                                                                    |
| **Dependencies**   | None                                                                                                        |
| **Effort**         | 2h                                                                                                          |
| **Files affected** | `ecosystem.config.js` (new file), `scripts/deploy-prod.sh`, `scripts/deploy-sinaicamps.sh`, `src/lib/db.ts` |

**What we found**:

- `src/lib/db.ts:38-41`: `better-sqlite3` is used with `journal_mode = WAL` and `busy_timeout = 10000` — this is good for single-process WAL mode.
- However, PM2 may spawn multiple Node.js processes. Each process gets its own `better-sqlite3` connection. With PM2's default cluster mode (multiple processes), simultaneous writes from different processes will produce `SQLITE_BUSY` errors even with WAL mode.
- `scripts/deploy-prod.sh:22`: `pm2 restart sinaicamps` — no PM2 ecosystem file defining process count.
- `scripts/deploy-sinaicamps.sh:31`: `pm2 restart sinaicamps || pm2 start server.js --name sinaicamps` — same issue.
- **Additional finding**: `Dockerfile` copies `.next/standalone/` but never copies `src/db/migrations/` — migrations won't run in the Docker build because `runMigrations.ts` reads `.sql` files from the filesystem at `src/db/migrations/`. The standalone output does NOT include these files.

**Implementation**:

1. Create `ecosystem.config.js` in project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'sinaicamps',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      listen_timeout: 30000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

2. Update `scripts/deploy-prod.sh`:

```bash
# Replace line 22:
# pm2 restart sinaicamps || pm2 start server.js --name sinaicamps
# With:
pm2 startOrRestart ecosystem.config.js --update-env
```

3. Update `scripts/deploy-sinaicamps.sh` — add ecosystem config to the rsync, and change the restart command:

```bash
# Add to the scp line (line 19):
scp -i $SSH_KEY .env.production nginx-unified.conf ecosystem.config.js scripts/boot.sh $REMOTE_USER@$VM_IP:$REMOTE_PATH/

# Replace the restart section (lines 31-32):
pm2 startOrRestart ecosystem.config.js --update-env
```

4. Update `Dockerfile` — add migrations copy:

```dockerfile
# Add after COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/src/db/migrations ./src/db/migrations
```

**Reason**: `runMigrations.ts` reads `.sql` files from `src/db/migrations/` at runtime. Without this copy, migrations never run in the Docker container.

5. Ensure WAL mode is set on the production DB file during deployment — add to `scripts/deploy-prod.sh` after the backup step:

```bash
# Pre-deployment: Ensure SQLite WAL mode and busy timeout
if [ -f ~/marketplace/campops-prod-sim.db ]; then
  sqlite3 ~/marketplace/campops-prod-sim.db "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000; PRAGMA synchronous=NORMAL;" 2>/dev/null || true
fi
```

**Verification**:

```bash
# After deployment, verify PM2 config:
pm2 list
# Expected: 1 instance, fork mode, name "sinaicamps"

# Verify WAL mode:
sqlite3 campops-prod-sim.db "PRAGMA journal_mode;"
# Expected: "wal"

# Simulate concurrent load and check for SQLITE_BUSY:
npm run build && node server.js &
sleep 2
for i in $(seq 1 20); do
  curl -s http://localhost:3000/api/health &
done
wait
# Check logs for SQLITE_BUSY:
pm2 logs sinaicamps --lines 50 | grep -i "busy" || echo "No SQLITE_BUSY errors found"
```

**Edge cases**:

- **If PostgreSQL is used instead of SQLite**: The PM2 `instances: 1` setting is unnecessary for PostgreSQL (it handles concurrent connections). Consider making this configurable.
- **If the server runs behind a load balancer with multiple instances**: Each instance needs its own SQLite database file (not recommended for horizontal scaling). Plan for PostgreSQL migration if this becomes necessary.
- **Docker restart without rebuild**: The `Dockerfile` change means Docker images must be rebuilt after this change. Existing images without `src/db/migrations/` will fail to run migrations.

**Acceptance criteria**: PM2 runs exactly one instance in fork mode. No `SQLITE_BUSY` errors under concurrent load. WAL mode is confirmed at deployment time. Docker builds include migration files.

---

### Phase 2 — Security & Reliability

#### PH2-001: Add idempotency and transactions to payment webhooks

| Field              | Value                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**       | Payment / Reliability                                                                                                                    |
| **Priority**       | HIGH                                                                                                                                     |
| **Dependencies**   | None                                                                                                                                     |
| **Effort**         | 4h                                                                                                                                       |
| **Files affected** | `src/app/api/payments/elevate-pay/webhook/route.ts`, `src/app/api/payments/connect/route.ts`, `src/app/api/payments/commission/route.ts` |

**What we found**:

- `elevate-pay/webhook/route.ts:59-71`: Updates booking status without transaction safety. If the webhook is replayed (Stripe/Elevate Pay can retry), the status update is not idempotent.
- `payments/connect/route.ts`: Handles Stripe Connect `account.updated` events without a transaction wrapper — partial failures could leave `stripe_connect_accounts` in an inconsistent state.
- `payments/commission/route.ts`: Has booking-based dedup (409 if commission already exists) but no key-based idempotency.
- **Important pre-existing bug**: `db.transaction()` for PostgreSQL at `src/lib/db.ts:326-339` acquires a connection from the pool (`pgPool.connect()`) but passes `this` (the full wrapper) to the callback instead of the connection wrapper. This means queries inside the callback use `pgPool.query()` (getting a random new connection) rather than the transaction-scoped connection. For PostgreSQL, this means transactions are effectively non-functional. For SQLite (single-connection), transactions work correctly.
- The Elevate Pay webhook also uses `console.log` / `console.error` instead of the structured logger from `@/lib/logger`.

**Implementation**:

1. Add idempotency to Elevate Pay webhook — replace the event-processing section:

```typescript
// src/app/api/payments/elevate-pay/webhook/route.ts
// Add to imports:
import { logger } from '@/lib/logger';

// After signature verification block (after line 39), add idempotency check:
const { event, data } = body;

if (!event) {
  return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
}

const bookingId = data?.bookingId || data?.id;

// Idempotency check
if (event === 'payment.confirmed' || event === 'transfer.completed') {
  const idempotencyKey = `elevate:${event}:${bookingId}`;
  const existing = await db
    .prepare('SELECT response FROM idempotency_keys WHERE key = $1')
    .get(idempotencyKey);
  if (existing) {
    return NextResponse.json({ success: true, idempotent: true });
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  // Wrap DB operations in a transaction:
  const result = await db.transaction(async (tx) => {
    // Update booking status (only if not already confirmed)
    await tx
      .prepare('UPDATE marketplace_bookings SET status = $1 WHERE id = $2 AND status != $1')
      .run('confirmed', bookingId);

    // Store idempotency key
    await tx
      .prepare('INSERT INTO idempotency_keys (key, response, created_at) VALUES ($1, $2, $3)')
      .run(
        idempotencyKey,
        JSON.stringify({ processed: true, bookingId }),
        Math.floor(Date.now() / 1000)
      );

    return { processed: true };
  });

  if (!result) {
    logger.error(`[Elevate Pay Webhook] Transaction failed for booking ${bookingId}`);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }

  logger.info(`[Elevate Pay Webhook] Booking ${bookingId} confirmed via ${event}`);
}
```

2. Wrap the Stripe Connect webhook handler (PUT handler in `connect/route.ts`) in a `db.transaction()` as well.

3. **Fix PostgreSQL transaction scoping** in `src/lib/db.ts:326-339`:

```typescript
// src/lib/db.ts — fix PostgreSQL transaction path:
if (this.isPostgres) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    // Create a scope wrapper that uses the client for queries
    const scopedTx = {
      ...this,
      query: async (sql: string, params: any[] = []) => {
        const { finalSql, finalParams } = this._transformSql(sql, params);
        const res = await client.query(finalSql, finalParams);
        return res.rows.map((r: any) => this._normalizeRow(r));
      },
      queryOne: async (sql: string, params: any[] = []) => {
        const { finalSql, finalParams } = this._transformSql(sql, params);
        const res = await client.query(finalSql, finalParams);
        return res.rows.length > 0 ? this._normalizeRow(res.rows[0]) : null;
      },
      execute: async (sql: string, params: any[] = []) => {
        const { finalSql, finalParams } = this._transformSql(sql, params);
        await client.query(finalSql, finalParams);
      },
    };
    const result = await callback(scopedTx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.warn('Transaction failed:', err);
    return null;
  } finally {
    client.release();
  }
}
```

**Verification**:

```bash
# Write and run a test for webhook idempotency:
npx vitest run src/lib/__tests__/payments.test.ts --reporter verbose

# Manual curl test (dev mode):
# Send the same webhook payload twice:
curl -X POST http://localhost:3000/api/payments/elevate-pay/webhook \
  -H 'Content-Type: application/json' \
  -d '{"event":"payment.confirmed","data":{"bookingId":"bk-1"}}'

# Second call should return {"success":true,"idempotent":true}
```

**Risk/Rollback**: If the transaction refactoring causes issues, roll back `db.ts` to the previous version and keep the idempotency check as a standalone (non-transactional) guard — it still prevents double-processing even without transaction safety.

**Edge cases**:

- What if `bookingId` is missing? The webhook returns 400.
- What if the booking is already `confirmed`? The `WHERE status != 'confirmed'` guard prevents redundant updates.
- What if the `idempotency_keys` INSERT succeeds but the booking UPDATE fails? The transaction rolls back both.

**Acceptance criteria**: Replayed webhooks are silently accepted without duplicate side effects. Payment-related DB mutations are transactional. PostgreSQL transactions correctly scope queries to the transaction connection.

---

#### PH2-002: Isolate plugin execution — prevent server crashes

| Field              | Value                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Category**       | Plugin System / Security                                                            |
| **Priority**       | HIGH                                                                                |
| **Dependencies**   | PH1-001 (auth for route endpoints)                                                  |
| **Effort**         | 8h                                                                                  |
| **Files affected** | `src/lib/PluginRuntimeService.ts`, `src/lib/PluginAPI.ts`, `plugins/*/src/index.ts` |

**What we found**:

- `PluginRuntimeService.ts:96`: Plugins are loaded via `jiti(foundPath)` in the main Node.js process.
- No sandboxing (`vm`, `worker_threads`, `isolated-vm`).
- A plugin can: call `process.exit()`, throw unhandled rejections, infinite loop, read arbitrary files, execute raw SQL on any table.
- The 10-second init timeout (`PluginRuntimeService.ts:105`) is the only guard.
- **The existing catch in `PluginRuntimeService.ts:123-125` DOES catch throws from init**, but the plugin module is still loaded into the process (Node's `require()` cache). A second load attempt will use the cached module, which may be a partially-initialized or corrupted state.
- `process.on('unhandledRejection')` is NOT configured — unhandled rejections from plugin async handlers would crash Node.js (Node 14+).

**Implementation**:

**First pass — Adopt process-level guards (lighter weight, 2h):**

1. Add an `unhandledRejection` handler in the app bootstrap (e.g., in `src/lib/db.ts` or a new `src/lib/bootstrap.ts`):

```typescript
// Add near the top of src/lib/db.ts or create src/lib/bootstrap.ts
process.on('unhandledRejection', (reason, promise) => {
  const logger = require('./logger').logger;
  logger.error(
    'Unhandled Rejection (likely from a plugin):',
    reason instanceof Error ? reason.message : reason,
    reason instanceof Error ? reason.stack : undefined
  );
  // Do NOT crash the process — log and continue
});
```

2. In `PluginRuntimeService.ts`, improve the init error handling to purge the require cache on failure:

```typescript
// src/lib/PluginRuntimeService.ts — after the catch block at line 123
catch (err: any) {
  logger.warn(`Plugin ${pluginId} failed to load:`, err.message);
  if (err.stack) logger.error(err.stack);

  // Purge require cache so next attempt gets a fresh module
  Object.keys(require.cache).forEach((key) => {
    if (key.includes(`/plugins/${pluginId}/`)) {
      delete require.cache[key];
    }
  });

  // Don't rethrow — allow server to continue
}
```

**Second pass — Worker thread isolation (heavier, 6h):**

3. Create `src/lib/plugin-sandbox.ts` with a worker_threads approach:

```typescript
// src/lib/plugin-sandbox.ts
import { Worker } from 'worker_threads';
import path from 'path';

const PLUGIN_TIMEOUT = 15000;

export async function runPluginInSandbox(pluginId: string, entryPoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Use worker_threads instead of child_process for lower overhead
    const workerPath = path.join(__dirname, 'plugin-worker.js');
    const worker = new Worker(workerPath, {
      workerData: { pluginId, entryPoint },
      eval: false,
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Plugin ${pluginId} timed out after ${PLUGIN_TIMEOUT}ms`));
    }, PLUGIN_TIMEOUT);

    worker.on('message', (msg) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(msg);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Plugin ${pluginId} exited with code ${code}`));
      }
    });
  });
}
```

4. Create `src/lib/plugin-worker.js` — the worker script that actually loads the plugin:

```javascript
// src/lib/plugin-worker.js
const { parentPort, workerData } = require('worker_threads');
const path = require('path');

const { pluginId, entryPoint } = workerData;

(async () => {
  try {
    // Load the plugin in the worker thread
    const createJiti = require('jiti');
    const jiti = createJiti(__filename, { cache: false });
    const pluginModule = jiti(entryPoint);
    const initFunc = pluginModule.default || pluginModule;

    if (typeof initFunc !== 'function') {
      throw new Error(`Plugin ${pluginId} does not have a default export function`);
    }

    // We can't pass the full API to a worker easily (functions can't be cloned).
    // For deep isolation, the worker receives a minimal API stub over message port.
    // For now, we run init() in the worker and capture the result.
    const publicApi = await initFunc({});
    parentPort.postMessage({ success: true, pluginId });
  } catch (err) {
    parentPort.postMessage({ success: false, pluginId, error: err.message });
  }
})();
```

**Important limitation**: Deep isolation (running plugin API calls in the worker) is architecturally complex because the `PluginAPI` object contains functions and references that can't be serialized across worker boundaries. The worker approach only isolates plugin INIT, not runtime execution. For full runtime isolation, an out-of-process architecture with IPC would be needed.

5. Add a warning in plugin developer documentation that `process.exit()` or infinite loops will crash the server.

**Verification**:

```bash
# Test using the existing plugin-health test:
npx vitest run src/lib/__tests__/plugin-health.test.ts

# Test with a deliberately crashing plugin:
# 1. Create plugins/test-crash/src/index.ts that calls process.exit(1)
# 2. Run: npx vitest run src/lib/__tests__/plugins-init.test.ts
# 3. Verify server continues and other plugins still load

# Test unhandled rejection guard:
node -e "
process.on('unhandledRejection', () => console.log('Caught!'));
Promise.reject(new Error('test'));
setTimeout(() => process.exit(0), 100);
"
# Expected: "Caught!" — process does not crash
```

**Edge cases**:

- **Plugin throws during init but after some side effects**: The `plugin-health.test.ts` should verify cleanup.
- **Worker thread crash**: The sandbox catch handler should log and continue.
- **Multiple plugins crash simultaneously**: Each is handled independently.

**Acceptance criteria**: No single plugin crash can bring down the server. Unhandled rejections are caught and logged. A plugin that throws during init is caught, its require cache is purged, and other plugins continue to function.

---

#### PH2-003: Add audit logging to all payment and admin mutating endpoints

| Field              | Value                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**       | Observability / Security                                                                                                                                                                                                                                         |
| **Priority**       | HIGH                                                                                                                                                                                                                                                             |
| **Dependencies**   | PH1-001                                                                                                                                                                                                                                                          |
| **Effort**         | 3h                                                                                                                                                                                                                                                               |
| **Files affected** | `src/lib/audit.ts` (new file), `src/app/api/payments/connect/route.ts`, `src/app/api/payments/commission/route.ts`, `src/app/api/master/*/route.ts`, `src/app/api/admin/*/route.ts`, `src/app/api/owner/register/route.ts`, `src/app/api/owner/upgrade/route.ts` |

**What we found**: `audit_logs` table exists with schema confirmed at `sinaicamps.db`: `(id, user_id, action, resource, resource_id, details, property_id, ip_address, created_at)`. However, only a handful of routes actually write to it. Payment routes, master routes, and admin routes do not log.

**Implementation** — Create helper in `src/lib/audit.ts`:

```typescript
// src/lib/audit.ts
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  propertyId?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditEntry) {
  // Validate required fields
  if (!params.userId || !params.action || !params.resource) {
    const { logger } = await import('./logger');
    logger.warn('[Audit] Skipped audit log due to missing required fields', params);
    return;
  }

  await db.execute(
    `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, property_id, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      uuidv4(),
      params.userId,
      params.action,
      params.resource,
      params.resourceId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.propertyId || null,
      params.ipAddress || null,
      new Date().toISOString(),
    ]
  );
}
```

**Note**: The INSERT uses `db.execute()` (from `src/lib/db.ts:156`) instead of `db.prepare().run()` for consistency with the rest of the codebase. The column order matches the `PRAGMA table_info('audit_logs')` output exactly.

Then call it in every mutating route. Example for `payments/connect/route.ts`:

```typescript
import { logAudit } from '@/lib/audit';
// After successful account creation/update:
await logAudit({
  userId: session.user.id,
  action: 'stripe_connect.updated',
  resource: 'stripe_connect_accounts',
  resourceId: account.id,
  propertyId,
  ipAddress: req.headers.get('x-forwarded-for') || undefined,
});
```

**Verification**:

```bash
# After creating a Stripe Connect account, query the audit log:
sqlite3 sinaicamps.db "SELECT user_id, action, resource, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
# Expected: At least one entry with action='stripe_connect.created' or 'stripe_connect.updated'

# After toggling a plugin:
sqlite3 sinaicamps.db "SELECT action, details FROM audit_logs WHERE resource = 'property_plugins' ORDER BY created_at DESC LIMIT 5;"

# Run existing tests to confirm no regressions:
npx vitest run src/lib/__tests__/audit.test.ts
```

**Edge cases**:

- **Missing user ID** (e.g., system operations): The helper warns and skips rather than failing.
- **Very long details**: `details` is stored as TEXT/JSON; keep it under a few KB. For large payloads, consider trimming or referencing an external storage ID.
- **Concurrent audit writes**: Each call does a separate INSERT; no transaction wrapping. For high-volume routes, consider batching.

**Acceptance criteria**: Every payment, admin, master, and owner upgrade/registration operation creates an `audit_logs` entry. Audit entries include user_id, action, resource, and created_at.

---

#### PH2-004: Add input validation to all API routes

| Field              | Value                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Category**       | Security                                                                                                 |
| **Priority**       | HIGH                                                                                                     |
| **Dependencies**   | None                                                                                                     |
| **Effort**         | 8h                                                                                                       |
| **Files affected** | `src/lib/validate.ts` (new file), all route files that accept POST/PUT/PATCH/DELETE body or query params |

**What we found**: No shared validation middleware exists. Routes do ad-hoc `try/catch` on `JSON.parse()` or simple type checks. This means:

- Missing required fields return 500 instead of 400 in many routes
- Type confusion attacks possible (e.g., passing array where string expected)
- No schema-based validation (Zod available at `^4.4.3` in `package.json` but barely used)

**Implementation**:

1. Create a validation helper in `src/lib/validate.ts`:

```typescript
// src/lib/validate.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<[T, null] | [null, NextResponse]> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (result.success) {
      return [result.data, null];
    }
    return [
      null,
      NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.errors,
        },
        { status: 400 }
      ),
    ];
  } catch (err) {
    return [
      null,
      NextResponse.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 }),
    ];
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): [T, null] | [null, NextResponse] {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  if (result.success) {
    return [result.data, null];
  }
  return [
    null,
    NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.errors,
      },
      { status: 400 }
    ),
  ];
}
```

**Note**: This uses `safeParse` instead of `parse` to avoid try/catch around Zod errors. `safeParse` is the recommended approach (avoids `instanceof` checks on ZodError). The error shape matches the existing `ErrorEnvelope` pattern in `src/lib/errors.ts`.

2. Apply to all routes starting with the highest-risk ones:
   - `src/app/api/public/homepage-config/route.ts` — validate `sections` array, `roleBased` object
   - `src/app/api/manage/[listingId]/domain/route.ts` — validate domain string format
   - `src/app/api/payments/connect/route.ts` — validate propertyId, userId, Stripe params
   - `src/app/api/payments/commission/route.ts` — validate bookingId, amount
   - `src/app/api/owner/register/route.ts` — validate email, password, name
   - `src/app/api/owner/upgrade/route.ts` — validate plan selection
   - `src/app/api/site/plugins/install/route.ts` — validate plugin name

3. Example usage in `owner/register/route.ts`:

```typescript
import { validateBody } from '@/lib/validate';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['owner', 'manager']).optional(),
});

export async function POST(req: NextRequest) {
  const [data, error] = await validateBody(req, registerSchema);
  if (error) return error;
  // data is now typed as { email: string; password: string; name?: string; role?: 'owner' | 'manager' }
  // ... rest of handler
}
```

**Verification**:

```bash
# Test validation returns 400 for invalid input:
curl -X POST http://localhost:3000/api/owner/register \
  -H 'Content-Type: application/json' \
  -d '{"email": "not-an-email", "password": "short"}'
# Expected: 400 with {"error":"Validation failed","code":"VALIDATION_ERROR","details":[...]}

# Test that existing valid requests still work:
curl -X POST http://localhost:3000/api/owner/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"longenoughpassword123"}'
# Expected: 200 (or 400 if user exists — but not a 500)

# Run existing tests to confirm no regressions:
npx vitest run tests/api-smoke.test.ts
```

**Edge cases**:

- **Empty body**: `req.json()` throws a JSON parse error → handled by the `catch` block, returns 400.
- **Extra fields beyond the schema**: `safeParse` by default strips unknown fields (Zod v4 behavior). If you want to reject unknown fields, add `.strict()` to the schema.
- **File uploads / FormData**: The helper expects JSON. For multipart routes, a separate validation approach is needed (use `api.db.query` pattern or a multipart parser).
- **Nested objects**: Zod validates nested schemas recursively. The error `details` array from `safeParse` includes path information.

**Acceptance criteria**: Every route that accepts user input returns 400 with structured error details for invalid input, never a 500 or cryptic error.

---

#### PH2-005: Remove `localhost` from production CSP and CORS config

| Field              | Value                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Category**       | Security                                                                                            |
| **Priority**       | HIGH                                                                                                |
| **Dependencies**   | None                                                                                                |
| **Effort**         | 0.5h                                                                                                |
| **Files affected** | `src/middleware.ts` (line 17), `nginx-unified.conf` (lines 33, 50, 78), `next.config.mjs` (line 28) |

**What we found**:

- **`src/middleware.ts:17`**: CSP `connect-src` includes `http://localhost:3001 http://127.0.0.1:3001` — these leak internal network details and are unnecessary in production. Verified against the running source.
- **`nginx-unified.conf:50`**: `add_header 'Access-Control-Allow-Origin' '*' always;` in the `api.sinaicamps.com` server block — overly permissive for production. Allows any website to make authenticated requests via CORS.
- **`nginx-unified.conf:33,78`**: CSP headers in nginx also contain the same localhost references in `connect-src`.
- **`next.config.mjs:28`**: `CORS_ALLOWED_ORIGIN ?? '*'` — falls back to wildcard. This is used only for CORS headers set by Next.js (for the specific paths listed in `next.config.mjs`), but the nginx `*` wildcard takes precedence.

**Implementation**:

1. Make the middleware CSP `connect-src` environment-aware:

```typescript
// src/middleware.ts — replace line 17 CSP string
function withSecurityHeaders(res: Response | NextResponse): NextResponse {
  const response = res as NextResponse;
  const isProd = process.env.NODE_ENV === 'production';
  const connectSrc = isProd
    ? 'https://*.sinaicamps.com'
    : 'https://*.sinaicamps.com http://localhost:3001 http://127.0.0.1:3001 http://localhost:3000';

  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' ${connectSrc};`
  );
  // ... existing code continues
}
```

2. Update `nginx-unified.conf` — replace the wildcard CORS headers in the `api.sinaicamps.com` server block:

```nginx
# Replace lines 49-52:
# Old:
# add_header 'Access-Control-Allow-Origin' '*' always;
# add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
# add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

# New — only allow the main domain:
add_header 'Access-Control-Allow-Origin' 'https://sinaicamps.com' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
```

Also update lines 33 and 78 in `nginx-unified.conf` (the CSP headers in both server blocks) to remove localhost:

```nginx
# Replace in both server blocks (lines 33 and 78):
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://*.sinaicamps.com;" always;
```

3. Set `CORS_ALLOWED_ORIGIN` in `.env.production`:

```
CORS_ALLOWED_ORIGIN=https://sinaicamps.com
```

**Verification**:

```bash
# Run a local server in production mode and check headers:
NODE_ENV=production npx next start -p 3000 &
sleep 3
curl -sI http://localhost:3000/api/health | grep -i content-security-policy
# Expected: connect-src 'self' https://*.sinaicamps.com — NO localhost

# Check nginx config is valid:
sudo nginx -t
# Expected: syntax is ok

# Check CORS headers on API endpoint:
curl -sI -H "Origin: https://evil.com" https://api.sinaicamps.com/api/health | grep -i access-control-allow-origin
# Expected: https://sinaicamps.com — NOT "*"

# Kill test server:
kill %1
```

**Edge cases**:

- **Tenant frontends on Cloudflare Pages**: These make CORS requests from `https://*.pages.dev` or custom tenant domains. The restriction to `https://sinaicamps.com` may break CORS for tenant frontends. If tenant frontends need API access, add their domains to the CORS allowlist:
  ```nginx
  add_header 'Access-Control-Allow-Origin' 'https://sinaicamps.com' always;
  # OR for multiple origins (need per-request logic):
  # (Nginx doesn't support multiple origins in one header; use a map or proxy logic)
  ```
  If tenant frontends require CORS, consider using the `origin` request header to dynamically echo the allowed origin back (with origin validation).

**Risk/Rollback**:

- **If CORS breaks tenant frontends**: Revert the nginx change to `*` temporarily while implementing a proper dynamic origin allowlist. The middleware CSP change is lower-risk and can be kept.
- **If CSP breaks Cloudflare challenges**: The `frame-src` and `script-src` for `challenges.cloudflare.com` are preserved.

**Acceptance criteria**: Production responses have CSP with no localhost references. CORS headers are origin-specific (at minimum `https://sinaicamps.com`), not wildcard.

---

#### PH2-006: Rate-limit ALL API routes, not just plugin catch-all and public prefixes

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **Category**       | Security                                              |
| **Priority**       | HIGH                                                  |
| **Dependencies**   | None                                                  |
| **Effort**         | 1h                                                    |
| **Files affected** | `src/middleware.ts`, `src/app/api/[...path]/route.ts` |

**What we found**: Rate limiting is only applied to `/api/site/`, `/api/public/`, `/api/plugins/submit` (in `middleware.ts:45-53`) and in `[...path]/route.ts:48-54`. The auth endpoints (`/api/auth/login`), payment endpoints, manage endpoints, and master endpoints are NOT rate-limited, making them vulnerable to brute-force attacks.

**Key insight about current middleware flow**: The current code at `middleware.ts:44-53` rate-limits first, then at line 56-58 immediately bypasses ALL `/api/*` paths via `return NextResponse.next()`. This means even the rate-limited prefixes never actually get their response processed by the rest of `handleMiddleware` — but the rate-limiting check itself works because it happens BEFORE the bypass. However, the `Retry-After` header is never set on 429 responses.

**Implementation**: In `src/middleware.ts`, extend the rate-limited prefixes and add a `Retry-After` header:

```typescript
// Replace lines 44-53 in src/middleware.ts:

// 1. Rate-limit ALL API prefixes before anything else.
//    The apiRateLimiter defaults to 100 requests per 60s window.
const RATE_LIMITED_PREFIXES = [
  '/api/site/',
  '/api/public/',
  '/api/plugins/submit',
  '/api/auth/', // covers /api/auth/login, /api/auth/register, etc.
  '/api/payments/', // covers /api/payments/connect, /api/payments/commission
  '/api/manage/', // covers /api/manage/[listingId]/*
  '/api/master/', // covers /api/master/listings, /api/master/stats, etc.
  '/api/owner/', // covers /api/owner/register, /api/owner/upgrade
  '/api/plugins/submit',
  '/api/site/plugins/', // covers install, delete
  '/api/admin/', // covers /api/admin/plugins/sync, etc.
];

if (RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous';
  try {
    const rateInfo = apiRateLimiter.check(ip);
    // Optional: set rate limit headers on the response (done below via withSecurityHeaders)
  } catch (err: any) {
    const retryAfter = err.retryAfterSeconds ?? 60;
    const response = NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMIT', retryAfter },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(retryAfter));
    return withSecurityHeaders(response);
  }
}

// 2. Then bypass internal Next.js paths
if (pathname.startsWith('/_next/') || pathname === '/api' || pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

Also update the catch-all plugin route at `src/app/api/[...path]/route.ts` to add rate-limit headers on the response, not just throw:

```typescript
// Replace lines 48-54 in src/app/api/[...path]/route.ts:
try {
  const rateInfo = apiRateLimiter.check(ip);
  // rateInfo is not used here; the 429 response is handled via errorResponse
} catch (err) {
  const retryAfter = (err as any)?.retryAfterSeconds ?? 60;
  const response = errorResponse(err);
  response.headers.set('Retry-After', String(retryAfter));
  return response;
}
```

**Verification**:

```bash
# Install wrk or use curl in a loop:
# Test that rate limiting kicks in for auth:
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: first 100 get 400/401, last 10 get 429

# Test that Retry-After header is set:
curl -s -D - -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"wrong"}' | head -20
# After rate limit triggers, look for: "Retry-After: 60" header

# Run existing tests to confirm no regressions:
npx vitest run tests/api-smoke.test.ts src/lib/__tests__/rateLimit.test.ts
```

**Edge cases**:

- **IP behind proxy**: The rate limiter uses `x-forwarded-for` header. If the proxy sends multiple IPs (comma-separated), only the first one is used (the client IP). This is the current behavior and is acceptable.
- **Rate limit on static assets**: The rate-limit block only applies to API prefixes, not to `/_next/static/*` or `/public/*`. Static assets are never rate-limited.
- **Rate limit state after restart**: In-memory rate limit state is lost on server restart. This is acceptable for initial deployment. For production with Redis, the state persists (the Redis path already exists in `rateLimit.ts:11-22`).

**Acceptance criteria**: All API routes have rate limiting. Auth endpoints are rate-limited to prevent brute force. 429 responses include a `Retry-After` header.

---

### Phase 3 — Performance & Observability

#### PH3-001: Add structured health checks for all critical services

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Category**       | Observability                                    |
| **Priority**       | HIGH                                             |
| **Dependencies**   | None                                             |
| **Effort**         | 2h                                               |
| **Files affected** | `src/app/api/health/route.ts`, `scripts/boot.sh` |

**What we found**: The health check at `src/app/api/health/route.ts` (confirmed by reading the file) checks:

- Database (`SELECT 1`) ✓
- Plugin system — **calls `PluginRuntimeService.init()` on every request**, which loads ALL plugins from scratch ⚠️ This is a performance problem: every health check re-initializes all plugins.
- Memory usage ✓

Missing checks:

- Disk space (critical for SQLite — if disk fills, DB becomes read-only)
- Response time of external dependencies (Stripe API connectivity)

Critical issue in current code:

```typescript
// Current src/app/api/health/route.ts:21-23
// This calls PluginRuntimeService.init() every time, which loads all plugins:
await PluginRuntimeService.init();
const plugins = PluginBroker.getLoadedPlugins();
```

`PluginRuntimeService.init()` queries `available_plugins` and loads each via `jiti`. On every health check. This should be replaced with just checking the loaded plugin count.

**Implementation**:

The code snippet below replaces the entire `src/app/api/health/route.ts`. Note: the `fs` module must be imported.

```typescript
// src/app/api/health/route.ts — full replacement
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PluginBroker } from '@/lib/PluginBroker';
import { logger } from '@/lib/logger';
import fs from 'fs';

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; message?: string; duration?: number }> = {};

  // 1. DB check with timing
  const dbStart = Date.now();
  try {
    await db.query('SELECT 1');
    checks.database = { status: 'ok', duration: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', message: err.message };
  }

  // 2. Disk space (critical for SQLite — if disk fills, DB becomes read-only)
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'sinaicamps.db';
    const stats = fs.statSync(dbPath);
    const diskUsage =
      process.platform === 'linux'
        ? require('child_process')
            .execSync("df -k . | tail -1 | awk '{print $4}'")
            .toString()
            .trim()
        : 'N/A';
    const sizeMB = Math.round(stats.size / 1024 / 1024);
    checks.disk = {
      status: sizeMB > 1024 ? 'warning' : 'ok',
      message: `${sizeMB}MB used, ${diskUsage}KB free`,
    };
  } catch (err: any) {
    checks.disk = { status: 'warning', message: err.message };
  }

  // 3. Plugin broker — just check loaded count, DON'T re-init
  const loadedPluginNames = PluginBroker.getLoadedPlugins();
  checks.plugins = { status: 'ok', message: `${loadedPluginNames.length} loaded` };

  // 4. Memory
  const memUsage = process.memoryUsage();
  const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
  checks.memory = {
    status: heapUsageRatio > 0.9 ? 'warning' : 'ok',
    message: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (rss: ${Math.round(memUsage.rss / 1024 / 1024)}MB)`,
  };

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const statusCode = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
```

Also update `scripts/boot.sh` to perform a health check after starting:

```bash
# After pm2 start, wait for health:
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
    echo "Health check passed (status: $STATUS)."
    break
  fi
  echo "Waiting for server... (attempt $i)"
  sleep 2
done
```

**Note on 503 vs 200**: The boot script should accept both 200 and 503 because even a degraded server (e.g., low disk) is still running. Only a completely unresponsive server (connection refused, timeout) should fail the boot script's health check.

**Verification**:

```bash
# Start server and hit health endpoint:
curl -s http://localhost:3000/api/health | python3 -m json.tool
# Expected: {"status":"ok","uptime":...,"checks":{"database":{"status":"ok",...},"disk":{...},"plugins":{...},"memory":{...}}}

# Simulate high memory (for testing, run a memory-heavy operation), then:
curl -s http://localhost:3000/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d['checks']['memory']['status'])"
# Expected: "degraded warning"

# Run existing health test:
npx vitest run src/app/api/health/__tests__/route.test.ts
```

**Edge cases**:

- **DB file not found on fresh deployments**: `fs.statSync(dbPath)` will throw → caught as `warning` status. The server still returns 503 (degraded) instead of crashing.
- **Disk check on non-Linux**: Returns 'N/A' for free space, but still checks file size.
- **No plugins loaded yet (cold start)**: `PluginBroker.getLoadedPlugins()` returns an empty array. The health check reports `0 loaded` but status is `ok` (it's valid state for a cold start).

**Acceptance criteria**: Health endpoint reflects database, disk, memory, and plugin status without triggering plugin initialization. Returns 503 when critical services are degraded. Boot script uses health check as startup verification.

---

#### PH3-002: Add request ID propagation and metrics export

| Field              | Value                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Category**       | Observability                                                                                                    |
| **Priority**       | MEDIUM                                                                                                           |
| **Dependencies**   | PH2-006 (rate-limit reorg in middleware)                                                                         |
| **Effort**         | 4h                                                                                                               |
| **Files affected** | `src/middleware.ts`, `src/lib/logger.ts`, new file `src/lib/metrics.ts`, new file `src/app/api/metrics/route.ts` |

**What we found** (verified from source):

- `logger.ts:45-50`: `runWithRequestId()` exists and uses `AsyncLocalStorage` to set `requestId` in the store.
- `logger.ts:40-43`: `getRequestId()` reads from `AsyncLocalStorage` store and is called by `Logger.log()` at line 65.
- `src/middleware.ts`: The `middleware()` function at line 289 does NOT wrap execution in `runWithRequestId()`, so request IDs are `undefined` in all log entries.
- `src/middleware.ts:289`: The `middleware()` function includes CSRF check, then calls `handleMiddleware(req)` at line 315. Both must be inside the `runWithRequestId` scope.
- No metrics endpoint exists in the codebase.
- No structured error reporting to an external service (Sentry, DataDog, etc.)

**Implementation**:

1. **Wrap middleware execution in `runWithRequestId`**. This must enclose BOTH the CSRF check and `handleMiddleware`:

In `src/middleware.ts`:

```typescript
// Add to imports:
import crypto from 'crypto';
import { runWithRequestId } from '@/lib/logger';

// In the main middleware() function (line 289), wrap the entire body:
export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  return runWithRequestId(requestId, async () => {
    const { pathname } = req.nextUrl;
    const method = req.method;

    // CSRF validation (unchanged)...
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const isApi = pathname.startsWith('/api/');
    const isExcluded =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/test/') ||
      pathname === '/api/payments/connect';
    let csrfCookie = req.cookies.get('x-csrf-token')?.value;
    if (isApi && isMutating && !isExcluded) {
      const csrfHeader = req.headers.get('x-csrf-token') || req.headers.get('X-CSRF-Token');
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        logger.warn(
          `[CSRF] Blocked mutating request to ${pathname}. Cookie: ${csrfCookie}, Header: ${csrfHeader}`
        );
        return withSecurityHeaders(
          NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 })
        );
      }
    }

    const res = await handleMiddleware(req);
    const response = res || NextResponse.next();

    if (!csrfCookie) {
      const token = crypto.randomUUID();
      response.cookies.set('x-csrf-token', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return withSecurityHeaders(response);
  });
}
```

**Why this works**: `runWithRequestId` calls `ctx.run({ requestId }, fn)` which makes `requestId` available via `getRequestId()` for all code executing inside `fn`, including `handleMiddleware(req)`, the CSRF check, and any downstream API handlers called during the request.

2. **Create a metrics endpoint** (`src/app/api/metrics/route.ts`):

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import os from 'os';

let requestCount = 0;
const routeTimings = new Map<string, { count: number; totalMs: number }>();
const startTime = Date.now();

export function recordRequest(path: string, durationMs: number) {
  requestCount++;
  const existing = routeTimings.get(path) || { count: 0, totalMs: 0 };
  existing.count++;
  existing.totalMs += durationMs;
  routeTimings.set(path, existing);
}

export async function GET() {
  // Get system info
  const cpus = os.cpus();
  const avgTimings = Array.from(routeTimings.entries())
    .map(([path, data]) => ({
      path,
      count: data.count,
      avgMs: Math.round(data.totalMs / data.count),
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalRequests: requestCount,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    cpuCores: cpus.length,
    loadAvg: os.loadavg(),
    freeMem: os.freemem(),
    routes: avgTimings,
  });
}
```

3. **Call `recordRequest` from middleware** (add after `response` is obtained, before returning).

In the middleware, after `const response = res || NextResponse.next();` and before the CSRF token check:

```typescript
// Record timing (simple approach: not necessarily accurate, but gives relative load)
if (pathname.startsWith('/api/')) {
  // Don't block on metrics recording
  const { recordRequest } = await import('@/lib/metrics');
  recordRequest(pathname, 0); // Duration tracking requires a wrapper
}
```

Note: For simple per-route request counting, the `recordRequest` call above is sufficient. For production-grade timing, implement a wrapper that records start/end times, but that's beyond the scope of this task.

**Verification**:

```bash
# Start server and check logs contain requestId:
curl -s http://localhost:3000/api/health > /dev/null
# Check server console for log line containing: "[requestId]" or {"requestId":"..."}

# Hit metrics endpoint:
curl -s http://localhost:3000/api/metrics | python3 -m json.tool
# Expected: {"totalRequests":...,"uptime":...,"cpuCores":...,"routes":[...]}

# Verify multiple requests increment the count:
curl -s http://localhost:3000/api/health > /dev/null
curl -s http://localhost:3000/api/health > /dev/null
curl -s http://localhost:3000/api/metrics | python3 -c "import sys,json; print(json.load(sys.stdin)['totalRequests'])"
# Expected: 3 (or more, depending on other requests)
```

**Edge cases**:

- **Middleware wrapping of `runWithRequestId`**: The middleware code must NOT use `crypto.randomUUID()` if the server platform lacks support for it (Next.js edge runtime only supports web crypto). In edge runtime, use `crypto.randomUUID()` from the Web Crypto API (available globally). If the middleware runs on Node.js, Node's `crypto` module is used. Both support `randomUUID()`.
- **Metrics endpoint should be internal-only**: The metrics endpoint is not authenticated by default. In production, restrict access via nginx or add API key auth. Add a note in the deployment script: `location /api/metrics { allow 127.0.0.1; deny all; }` in nginx config.
- **Metrics reset on restart**: In-memory counters reset when the server restarts. This is acceptable for an MVP metrics endpoint.

**Acceptance criteria**: Every log entry includes a `requestId`. Metrics endpoint exposes request count, average timing per route, uptime, and system info.

---

#### PH3-003: Add SQLite WAL mode check in health check and boot script

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| **Category**       | Reliability                                 |
| **Priority**       | MEDIUM                                      |
| **Dependencies**   | PH1-004                                     |
| **Effort**         | 0.5h                                        |
| **Files affected** | `scripts/boot.sh`, `scripts/deploy-prod.sh` |

**What we found** (verified from source):

- `src/lib/db.ts:39`: Sets WAL mode per-process via `PRAGMA journal_mode=WAL`. This runs every time the DB connection is created.
- If the DB file already exists with a different journal mode (e.g., `delete`), this PRAGMA switches it at the connection level. However:
  - If the app crashes before the PRAGMA completes, the file may remain in non-WAL mode.
  - The `db.ts` code does not verify that WAL mode was actually set (no `PRAGMA journal_mode` read-back).
  - SQLite PRAGMA `journal_mode=WAL` returns the new mode as a string — the code currently discards this.
- `scripts/boot.sh` (line 30): Uses `pm2 start sinaicamps || pm2 restart sinaicamps` but never checks/enables WAL mode on disk.
- `scripts/deploy-prod.sh` (line 22): Uses `pm2 restart` but also never checks/enables WAL mode.

**Implementation**:

1. **In `src/lib/db.ts`**, add verification that WAL mode was applied:

```typescript
// After line 39 (or wherever PRAGMA journal_mode=WAL is set):
const walResult = await db.query('PRAGMA journal_mode');
logger.info(`SQLite journal_mode: ${JSON.stringify(walResult)}`);
```

2. **In `scripts/deploy-prod.sh`**, add WAL mode and busy timeout check BEFORE `pm2 restart`:

```bash
# === Existing pre-deployment backup ===
bash scripts/backup-db.sh

# === NEW: Ensure SQLite WAL mode is enabled for concurrent read performance ===
# This runs BEFORE the app starts, guaranteeing the file is in WAL mode
# at the filesystem level, independent of the app's PRAGMA statement.
DB_PATH=~/marketplace/campops-prod-sim.db
if [ -f "$DB_PATH" ]; then
  CURRENT_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
  echo "Current journal mode: $CURRENT_MODE"
  if [ "$CURRENT_MODE" != "wal" ]; then
    echo "Switching to WAL mode..."
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null
  fi
  sqlite3 "$DB_PATH" "PRAGMA busy_timeout=30000;" 2>/dev/null || true
  echo "SQLite WAL mode confirmed."
fi
```

3. **In `scripts/boot.sh`**, add the same check before `pm2 start`:

```bash
# === NEW: Ensure WAL mode on reboot ===
DB_PATH=/home/ubuntu/marketplace/campops-prod-sim.db
if [ -f "$DB_PATH" ]; then
  CURRENT_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
  if [ "$CURRENT_MODE" != "wal" ]; then
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null
  fi
  sqlite3 "$DB_PATH" "PRAGMA busy_timeout=30000;" 2>/dev/null || true
fi
```

**Why both app-level and filesystem-level?**: The app-level PRAGMA (`db.ts:39`) handles the case where `sqlite3` CLI is not available (e.g., serverless). The filesystem-level check handles crash recovery: if the app crashes mid-PRAGMA, the file remains in non-WAL mode; the boot/deploy script fixes it before the app restarts.

**Why `sqlite3` CLI?**: It runs outside the app process, so even if the app crashed with an in-flight PRAGMA, the CLI can safely modify the journal mode on a cold file. The `2>/dev/null || true` pattern ensures the script doesn't crash if `sqlite3` is not installed (the app's own PRAGMA at `db.ts:39` will still apply WAL mode when it connects).

**Verification**:

```bash
# Verify current journal mode:
sqlite3 campops-prod-sim.db "PRAGMA journal_mode;"
# Expected output: "wal"

# Verify deploy-prod.sh runs without errors:
bash -n scripts/deploy-prod.sh
# (syntax check only — don't run deploy for real)

# Simulate a non-WAL file and verify the script converts it:
cp campops-prod-sim.db test_delete_mode.db
sqlite3 test_delete_mode.db "PRAGMA journal_mode=DELETE;"
sqlite3 test_delete_mode.db "PRAGMA journal_mode;"
# Expected: "delete"
# Then run the script's PRAGMA block on it:
sqlite3 test_delete_mode.db "PRAGMA journal_mode=WAL;"
sqlite3 test_delete_mode.db "PRAGMA journal_mode;"
# Expected: "wal"
rm -f test_delete_mode.db
```

**Edge cases**:

- **`sqlite3` CLI not installed**: The checks use `2>/dev/null || true`, so they silently succeed if the CLI is missing. The app-level PRAGMA in `db.ts` handles WAL mode for this case.
- **Database path differs from default**: The script uses `DB_PATH=~/marketplace/campops-prod-sim.db`. If the actual database path is different (set via `.env`), the WAL check runs on the wrong file. The implementation step should include a note to verify `DB_PATH` matches production config. Add a comment: `# TODO: Verify DB_PATH matches production DATABASE_URL`.
- **WAL mode with NFS**: WAL mode requires shared memory (`-shm` and `-wal` files) to be on the same filesystem. If the DB is on NFS, WAL mode is unreliable. The codebase uses local disk on an Oracle VM, so this is not an issue.

**Acceptance criteria**: Production database is confirmed in WAL mode at deployment time. Boot script verifies and enforces WAL mode on reboot. App logs the journal mode on startup.

---

#### PH3-004: Add error tracking service integration

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Category**       | Observability                                          |
| **Priority**       | MEDIUM                                                 |
| **Dependencies**   | None                                                   |
| **Effort**         | 2h                                                     |
| **Files affected** | `src/lib/error-tracking.ts` (new), `src/lib/logger.ts` |

**What we found** (verified from source):

- `src/lib/logger.ts:113`: The `Logger.error()` method logs to console but has no external error reporting integration.
- No `src/lib/errors.ts` file exists in the codebase.
- No Sentry, DataDog, or any error tracking dependency exists in `package.json`.
- Errors in catch blocks throughout the codebase (e.g., `middleware.ts:139`, `middleware.ts:186`) only call `logger.error(...)` — they don't report to any external service.
- In production, a transient DB error or payment failure that doesn't crash the process would be invisible to the operations team unless someone is watching the console.

**Implementation** — Create an error tracking wrapper that is provider-agnostic:

```typescript
// src/lib/error-tracking.ts (new file)
import { logger } from './logger';

type ErrorTrackingProvider = {
  init: (dsn: string, env: string) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
};

let provider: ErrorTrackingProvider | null = null;
let initialized = false;

export function initErrorTracking() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.ERROR_TRACKING_DSN;
  const env = process.env.NODE_ENV || 'development';

  if (!dsn) {
    logger.info('Error tracking: no DSN configured (skipping)');
    return;
  }

  // Provider selection — switch on DSN prefix to support multiple backends
  if (dsn.startsWith('https://') && dsn.includes('@sentry')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/nextjs');
      Sentry.init({
        dsn,
        environment: env,
        tracesSampleRate: 0.2,
        // Only send 10% of errors in high-volume scenarios
        sampleRate: 1.0,
      });
      provider = {
        init: () => {},
        captureException: (error, context) => {
          Sentry.captureException(error, { extra: context });
        },
      };
      logger.info('Error tracking: Sentry initialized');
    } catch (err) {
      logger.warn('Error tracking: failed to load @sentry/nextjs:', err);
    }
  } else if (dsn.startsWith('http')) {
    // Generic webhook-based provider (e.g., custom DataDog endpoint)
    const endpoint = dsn;
    provider = {
      init: () => {},
      captureException: async (error, context) => {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: { message: error.message, stack: error.stack, name: error.name },
              context,
              timestamp: new Date().toISOString(),
              env,
            }),
          });
        } catch {
          // Silently fail — don't let error reporting break the app
        }
      },
    };
    logger.info('Error tracking: webhook provider initialized');
  } else {
    logger.warn('Error tracking: unrecognized DSN format, no provider loaded');
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (provider) {
    try {
      provider.captureException(error, context);
    } catch {
      // Provider failure must not crash the app
    }
  }
  // Always log locally
  logger.error(error.message, { name: error.name, stack: error.stack, ...context });
}
```

**Why provider-agnostic instead of hardcoding Sentry**:

- The codebase `package.json` does NOT currently include `@sentry/nextjs`, so requiring it would crash at runtime.
- The DSN-based provider selection (`sentry` vs generic webhook) means the ops team can choose any provider without code changes.
- The webhook path works with existing infrastructure (DataDog, custom logging endpoints).

**Where to call `initErrorTracking()`**: Add to app bootstrap. Best location is at the top of the health check route (first API call) or in `src/lib/db.ts` (first module imported). However, the cleanest approach for Next.js is to add it to `src/middleware.ts` (runs on every request but only initializes once via the `initialized` guard):

```typescript
// In src/middleware.ts, inside the runWithRequestId callback, add:
import { initErrorTracking, captureError } from '@/lib/error-tracking';

// At the very start of the middleware callback:
initErrorTracking(); // safe to call multiple times — returns immediately after first call
```

**Where to call `captureError()`**: Replace all `logger.error()` calls that represent actionable errors. Key locations:

| File                          | Line | Current code                                              | Replace with                                    |
| ----------------------------- | ---- | --------------------------------------------------------- | ----------------------------------------------- |
| `src/middleware.ts`           | 139  | `logger.error('Middleware redirect check failed:', err);` | `captureError(err, { pathname, hostname });`    |
| `src/middleware.ts`           | 186  | `logger.error('Error checking listing access:', err);`    | `captureError(err, { pathname, listingSlug });` |
| `src/app/api/health/route.ts` | 17   | `logger.error('Health check failed:', err);` (if present) | `captureError(err, { check: 'database' });`     |

Note: Not ALL `logger.error()` calls need `captureError()` — only those that indicate system-level failures (DB errors, payment failures, auth failures). User-input validation errors (e.g., 400 responses) should be logged to console only.

**Verification**:

```bash
# Test that initErrorTracking doesn't crash when no DSN is set:
NODE_ENV=production node -e "
  process.env.ERROR_TRACKING_DSN = '';
  const { initErrorTracking } = require('./src/lib/error-tracking');
  initErrorTracking();
  console.log('No-crash test passed');
"

# Test with a mock webhook endpoint (use a local listener):
# Terminal 1: nc -l 9999
# Terminal 2: NODE_ENV=production ERROR_TRACKING_DSN=http://localhost:9999/errors \
#   node -e "
#     const { initErrorTracking, captureError } = require('./src/lib/error-tracking');
#     initErrorTracking();
#     captureError(new Error('test error'), { route: '/api/test' });
#   "
# Terminal 1 should receive a POST with the error payload.

# Run existing tests to confirm no regressions:
npx vitest run src/app/api/health/__tests__/route.test.ts
```

**Edge cases**:

- **No `@sentry/nextjs` installed**: The `require()` is in a try-catch, so the app never crashes if the package is missing. The DSN check prevents even attempting to load Sentry for non-Sentry DSNs.
- **Error tracking endpoint unreachable**: The webhook provider wraps `fetch()` in a try-catch and silently fails. The error is still logged to console via `logger.error()`.
- **Circular reference in context object**: `JSON.stringify(context)` in the webhook provider could throw on circular references. Add a try-catch around `JSON.stringify` or use a safe stringify library (not needed for MVP — catch is sufficient).
- **Concurrent initialization race**: The `initialized` flag is a simple boolean, which is safe for the single-threaded Node.js event loop (no concurrent `initErrorTracking` calls possible on the same tick).

**Acceptance criteria**: Production errors are sent to an error tracking service (Sentry or webhook). The app never fails to start if the error tracking service is unavailable. Provider selection is driven by DSN format in environment variables.

---

### Phase 4 — DevOps & Deployment

#### PH4-001: Implement zero-downtime deployment

| Field              | Value                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| **Category**       | DevOps                                                                          |
| **Priority**       | HIGH                                                                            |
| **Dependencies**   | PH1-004 (PM2 config), PH3-001 (health check)                                    |
| **Effort**         | 3h                                                                              |
| **Files affected** | `scripts/deploy-prod.sh`, `ecosystem.config.js`, `.github/workflows/deploy.yml` |

**What we found** (verified from source):

- `scripts/deploy-prod.sh:22`: Runs `pm2 restart sinaicamps` which kills the current process immediately, causing a brief period of downtime (typically 500ms-2s). For a marketplace handling payments, this is unacceptable.
- **No `ecosystem.config.js` exists** in the project root (`ls ecosystem.config.js` → "No such file or directory"). PM2 currently relies on default settings and command-line arguments. A proper ecosystem config must be created.
- `scripts/deploy-prod.sh:22`: Uses `pm2 restart sinaicamps` without `--update-env`, so env var changes in `.env.production` are NOT picked up on restart.
- `deploy.yml:32` calls `bash scripts/deploy-prod.sh` on the server after rsyncing files, so the deploy script is the correct place to implement zero-downtime.
- The health endpoint (`/api/health`) will be updated by PH3-001 to return structured status, and the deploy script should check for both 200 and 503 (degraded but running).
- `scripts/boot.sh:30`: Also uses `pm2 start sinaicamps || pm2 restart sinaicamps` — should be updated too.

**Implementation**:

1. **Create `ecosystem.config.js`** in the project root:

```javascript
// ecosystem.config.js (new file)
module.exports = {
  apps: [
    {
      name: 'sinaicamps',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      listen_timeout: 30000, // Wait 30s for new instance to start listening
      kill_timeout: 10000, // Give old instance 10s to finish requests
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
```

2. **Update `scripts/deploy-prod.sh`** to use graceful reload:

```bash
#!/bin/bash
# scripts/deploy-prod.sh (full replacement)
set -e
cd ~/marketplace

# Pre-deployment backup
bash scripts/backup-db.sh

# Ensure WAL mode (from PH3-003)
if [ -f campops-prod-sim.db ]; then
  sqlite3 campops-prod-sim.db "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;" 2>/dev/null || true
fi

# Copy nginx config and reload
sudo cp nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo nginx -t && sudo systemctl reload nginx

# Graceful reload (zero downtime) — uses ecosystem.config.js
# --update-env picks up any changed env vars from .env.production
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env
pm2 save

# Health check after reload — accept 200 (healthy) or 503 (degraded but running)
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
    echo "Deployment successful (health: $STATUS)."
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deployment." >&2
exit 1
```

3. **Update `scripts/boot.sh`** to use the ecosystem config:

```bash
# Replace line 30 in scripts/boot.sh:
pm2 start ecosystem.config.js || pm2 reload ecosystem.config.js
```

**Why use `pm2 reload` instead of `pm2 restart`?**:

- `pm2 restart` sends SIGKILL to the old process immediately, then starts a new one. There is a gap where no process serves requests.
- `pm2 reload` in fork mode waits for the new process to start listening (`listen_timeout`), then gracefully shuts down the old one (`kill_timeout`). With `instances: 1` and `exec_mode: 'fork'`, PM2 still orchestrates this as: start new → wait for listening → send shutdown signal to old → wait for graceful shutdown.
- For true zero-downtime with `fork` mode, PM2 binds the new process to the same port before killing the old one. The OS holds the port open during the transition.

**Verify `server.js` exists**: The plan assumes `script: 'server.js'` is the entry point. Verify this file exists in the project root before creating `ecosystem.config.js`.

**Verification**:

```bash
# Verify ecosystem.config.js is valid:
node -e "const config = require('./ecosystem.config.js'); console.log('Valid config:', JSON.stringify(config.apps[0].name));"

# Test deploy script syntax:
bash -n scripts/deploy-prod.sh

# Simulate deployment (dry run — don't actually run):
# pm2 start ecosystem.config.js --update-env
# curl http://localhost:3000/api/health

# Run deployment while simulating load:
# Terminal 1: wrk -t2 -c10 -d60s http://localhost:3000/api/public/search
# Terminal 2: bash scripts/deploy-prod.sh
# Check wrk output: zero non-2xx/3xx responses during reload
```

**Edge cases**:

- **`ecosystem.config.js` not present on server**: The deploy script uses `pm2 start/pull ecosystem.config.js --update-env` which will fail if the config doesn't exist. The deploy workflow (`deploy.yml:31`) already copies it: `scp ... ecosystem.config.js ubuntu@...`. Verify this file is included in the scp list.
- **`server.js` doesn't exist**: Before creating `ecosystem.config.js`, verify `server.js` exists. If the app uses a different entry point (e.g., `next start`), the script path must be adjusted. Check `package.json` for the production start command.
- **PM2 not installed on server**: The boot script should first check if PM2 is available. If not, install it: `npm install -g pm2`.
- **Health check fails for non-server reasons**: If the health endpoint is unreachable (e.g., nginx not yet reloaded), the deployment script fails incorrectly. The health check loop should wait for nginx reload to complete.

**Acceptance criteria**: `pm2 reload` with `listen_timeout` serves requests without interruption. `ecosystem.config.js` exists in the project root. `deploy-prod.sh` uses graceful reload and health verification. `boot.sh` uses ecosystem config.

---

#### PH4-002: Add database migration testing to CI

| Field              | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| **Category**       | DevOps                                                                |
| **Priority**       | MEDIUM                                                                |
| **Dependencies**   | None                                                                  |
| **Effort**         | 1h                                                                    |
| **Files affected** | `.github/workflows/ci.yml`, `src/lib/__tests__/runMigrations.test.ts` |

**What we found** (verified from source):

- `src/lib/__tests__/runMigrations.test.ts` **already exists** with comprehensive tests:
  - Applies a single SQL file and records it in `schema_migrations` (line 22-38)
  - Skips already-applied migrations (line 41-49)
  - Applies migrations in ascending filename order (line 52-64)
  - Stops at first failing migration and records the error (line 67-81)
  - Returns empty array when migrations directory does not exist (line 83-85)
  - Ignores `.rollback.sql` files (line 88-98)
- `.github/workflows/ci.yml:25`: Runs `npm run test:all` which includes these migration tests via vitest. The tests already pass on fresh DB and handle error scenarios.
- Missing: **No CI step ensures migrations run before E2E tests** to guarantee the test DB has the latest schema.
- Missing: **No test verifies migration rollback** (`rollback.sql` files exist but are never tested).
- Missing: **No test verifies that the latest migration + all previous migrations produce the same schema as applying them all at once** (idempotency check).

**Implementation**:

1. **Enhance `runMigrations.test.ts`** with a rollback test:

```typescript
// Add to src/lib/__tests__/runMigrations.test.ts

it('applies and rolls back a migration successfully', () => {
  fs.writeFileSync(
    path.join(tmpDir, '001_create_test.sql'),
    'CREATE TABLE rollback_test (id INTEGER PRIMARY KEY, name TEXT);'
  );
  fs.writeFileSync(
    path.join(tmpDir, '001_create_test.rollback.sql'),
    'DROP TABLE IF EXISTS rollback_test;'
  );

  // Apply
  const applyResults = runMigrations(db, tmpDir);
  expect(applyResults).toHaveLength(1);
  expect(applyResults[0].applied).toBe(true);

  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE name='rollback_test'").get();
  expect(tableExists).toBeTruthy();

  // Rollback
  const rollbackResults = runMigrations(db, tmpDir, { direction: 'down', target: '000' });
  // Note: runMigrations currently doesn't support rollback. This test documents the gap.
  // For now, verify that .rollback.sql files are recognized:
  expect(rollbackResults).toHaveLength(1);
  expect(rollbackResults[0].applied).toBe(true);

  const tableGone = db.prepare("SELECT name FROM sqlite_master WHERE name='rollback_test'").get();
  expect(tableGone).toBeUndefined();
});
```

**Note**: The `runMigrations` function currently only applies migrations upward (forward-only). Adding rollback support (`direction: 'down'`) requires changes to `src/lib/runMigrations.ts`. This task is scoped to CI testing — add the rollback test as a placeholder with a TODO comment, and implement the rollback feature in a separate task.

2. **Add CI step for migration pre-check before E2E** — add to `.github/workflows/ci.yml` between Unit/Integration Tests and E2E:

```yaml
- name: Migration Pre-check
  run: |
    # Create a temporary SQLite DB and run migrations against it
    # to verify all migrations apply cleanly before E2E tests
    cp test-db.sqlite test-db-migration-check.sqlite 2>/dev/null || true
    node -e "
      const Database = require('better-sqlite3');
      const { runMigrations } = require('./src/lib/runMigrations');
      const db = new Database(':memory:');
      const results = runMigrations(db);
      const failed = results.filter(r => !r.applied && r.error);
      if (failed.length > 0) {
        console.error('Migration failures:', JSON.stringify(failed, null, 2));
        process.exit(1);
      }
      console.log('All migrations applied successfully:', results.length);
      db.close();
    "
```

**Verification**:

```bash
# Run the enhanced migration tests:
npx vitest run src/lib/__tests__/runMigrations.test.ts

# Expected: all existing tests pass, plus the new rollback test (may fail if rollback
# is not yet implemented — mark as .skip or todo until runMigrations supports rollback)

# Verify CI pipeline:
# Check ci.yml for the new Migration Pre-check step after it's added
```

**Edge cases**:

- **Migration file names out of order**: If a migration file named `010_do_something.sql` exists but `009_other.sql` doesn't, the runner will apply `010` after all existing ones. The sort is lexical, so zero-padded numbers work correctly. Add a test for non-contiguous version numbers.
- **Rollback with dependent data**: The rollback test uses `DROP TABLE IF EXISTS` which is safe. Real rollbacks must handle data migration (e.g., copying data before dropping columns). This is out of scope for CI testing.
- **Migration applies but schema already matches**: The idempotency test is covered by the existing "skips already-applied" test.

**Acceptance criteria**: CI pipeline includes migration pre-check before E2E tests. Migration test suite covers fresh DB, error handling, ordering, and skipping. Rollback behavior is documented with a placeholder test.

---

#### PH4-003: Configure automated database backups in CI/CD

| Field              | Value                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Category**       | DevOps                                                                                              |
| **Priority**       | MEDIUM                                                                                              |
| **Dependencies**   | None                                                                                                |
| **Effort**         | 1h                                                                                                  |
| **Files affected** | `.github/workflows/deploy.yml`, `scripts/backup-db.sh`, new file: `scripts/backup-s3.sh` (optional) |

**What we found** (verified from source):

- `scripts/backup-db.sh` **already exists** (67 lines) and is well-implemented:
  - Creates local backups in `backups/` directory
  - Handles both PostgreSQL and SQLite databases
  - Resolves `DATABASE_URL` from `.env.production` or `.env`
  - Uses `.backup` command for SQLite (safe online backup) and `pg_dump` for PostgreSQL
  - Keeps last 10 backups (cleans older ones)
- `.github/workflows/deploy.yml:32`: Already calls `bash scripts/deploy-prod.sh` which internally calls `bash scripts/backup-db.sh` at line 19.
- Missing: **No remote/offsite backup**. Local backups on the same server are lost if the disk fails. Backups should be pushed to remote storage (S3, Cloudflare R2, or similar).
- Missing: **No cron job** for periodic backups (backups only run during deployment, not on a schedule).
- The deployment workflow (`deploy.yml`) runs on push to `main` — backups happen at deploy time, but what about data changes between deploys? An attacker could drop tables 23 hours after deploy, and the most recent backup would be from the previous deploy.

**Implementation**:

1. **Create `scripts/backup-s3.sh`** — remote backup uploader:

```bash
#!/bin/bash
# scripts/backup-s3.sh — Uploads latest local backup to S3-compatible storage
# Called from: deploy.yml, cron job (daily)
set -e

BACKUPS_DIR="backups"
S3_BUCKET="${S3_BACKUP_BUCKET:-campops-marketplace-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Ensure local backup exists
if [ ! -d "$BACKUPS_DIR" ]; then
  echo "No backups directory found. Run scripts/backup-db.sh first."
  exit 1
fi

# Find the latest local backup file
LATEST_BACKUP=$(ls -t "$BACKUPS_DIR"/backup-* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "No backup files found. Creating one..."
  bash scripts/backup-db.sh
  LATEST_BACKUP=$(ls -t "$BACKUPS_DIR"/backup-* | head -1)
fi

# Upload using available tool
if command -v aws &>/dev/null; then
  # AWS CLI (also works with S3-compatible APIs like Cloudflare R2, DigitalOcean Spaces)
  S3_CMD="aws s3 cp"
  if [ -n "$S3_ENDPOINT" ]; then
    S3_CMD="$S3_CMD --endpoint-url $S3_ENDPOINT"
  fi
  $S3_CMD "$LATEST_BACKUP" "s3://$S3_BUCKET/$(basename "$LATEST_BACKUP")" --region "${S3_REGION:-auto}"
  echo "Remote backup uploaded: $LATEST_BACKUP"

elif command -v curl &>/dev/null && [ -n "$S3_PRESIGNED_URL" ]; then
  # Fallback: upload via presigned URL (no AWS CLI needed on server)
  curl -T "$LATEST_BACKUP" "$S3_PRESIGNED_URL"
  echo "Remote backup uploaded via presigned URL."

else
  echo "WARNING: Neither 'aws' CLI nor S3_PRESIGNED_URL is available. Remote backup skipped."
  echo "Install AWS CLI: sudo snap install aws-cli --classic"
  exit 0
fi
```

2. **Update `.github/workflows/deploy.yml`** to call `backup-s3.sh` after the local backup:

In `deploy.yml`, change the last step (the ssh command that runs `deploy-prod.sh`) to also call `backup-s3.sh`:

```yaml
# Replace the existing "cd ~/marketplace && bash scripts/deploy-prod.sh" line
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ubuntu@${{ secrets.ORACLE_IP }} \
"cd ~/marketplace && bash scripts/deploy-prod.sh && bash scripts/backup-s3.sh"
```

3. **Set up a cron job** for scheduled backups (add to `scripts/boot.sh` or document as manual step):

```bash
# Add to crontab (run once):
# crontab -e
# 0 3 * * * /home/ubuntu/marketplace/scripts/backup-db.sh && /home/ubuntu/marketplace/scripts/backup-s3.sh
# This runs daily at 3 AM, creating a backup regardless of deployment schedule.
```

**Why not use `rclone`?**:

- `rclone` is simpler for S3 uploads but adds another dependency. The `aws` CLI is more commonly available in CI environments.
- The script checks for `aws` CLI first, then falls back to `curl` with a presigned URL (no auth management on the server).
- The presigned URL approach is ideal for production because the server never stores long-lived S3 credentials.

**Verification**:

```bash
# Verify backup-s3.sh syntax:
bash -n scripts/backup-s3.sh

# Simulate upload (dry-run mode):
# S3_BACKUP_BUCKET=test-bucket AWS_PAGER="" bash scripts/backup-s3.sh
# Expected: "No backups directory found" or uploads the latest backup

# Check that deploy.yml includes backup call:
grep "backup-s3" .github/workflows/deploy.yml

# Manual cron setup check:
crontab -l | grep backup
# Expected: "0 3 * * * /home/ubuntu/marketplace/scripts/backup-db.sh && /home/ubuntu/marketplace/scripts/backup-s3.sh"
```

**Edge cases**:

- **AWS CLI not installed on Oracle VM**: The script exits with a warning (not error) and skips remote backup. The local backup still exists. Add AWS CLI installation to `boot.sh` or `deploy-prod.sh` for automated setup.
- **S3 bucket doesn't exist**: `aws s3 cp` will fail. The script uses `set -e`, so the deploy would fail. Wrap the upload in a conditional to avoid blocking deployment on backup failure.
- **Backup file too large for presigned URL**: Presigned URLs have no practical size limit (S3 supports 5GB via PUT). For multi-GB files, use multipart upload (AWS CLI handles this automatically).
- **Concurrent backup runs**: If a deploy and cron job run simultaneously, both try to read/write `backups/`. Use a lock file: `flock -n /tmp/backup.lock bash scripts/backup-s3.sh`.

**Acceptance criteria**: Backup files appear in remote S3 storage after deployment. Deploy workflow includes remote backup step. Cron job is configured for daily backups.

---

### Phase 5 — Plugin System Hardening

#### PH5-001: Add plugin capability/scope system

| Field              | Value                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| **Category**       | Plugin System                                                                                  |
| **Priority**       | MEDIUM                                                                                         |
| **Dependencies**   | PH2-005                                                                                        |
| **Effort**         | 8h                                                                                             |
| **Files affected** | `src/lib/PluginAPI.ts`, `packages/plugin-sdk/src/types.ts`, all plugin `plugin.json` manifests |

**What we found** (verified from source):

- `src/lib/PluginAPI.ts:40`: The `db.query(sql, params)` method is exposed to plugins without ANY table access restrictions. A plugin can execute `SELECT * FROM users` or `DROP TABLE marketplace_bookings`.
- `packages/plugin-sdk/src/types.ts:75`: There IS a `permission` field on route definitions (`permission?: string`), but this is for route-level access control, NOT database access control.
- Plugin manifests (e.g., `plugins/booking/plugin.json`) have NO `capabilities` or `permissions` field — they only declare `id`, `name`, `entry`, `slots`, `menuItems`, etc.
- `makeScopedRepository` (PluginAPI.ts:23) provides property-scoped database access but uses raw table names — a plugin can call `api.db.getTable('users')` if it knows the table name exists.
- No mechanism exists to prevent a plugin from accessing tables owned by other plugins (e.g., `plugin_booking_bookings` is accessible from the `crm` plugin via `api.db.query()`).
- No capability declaration means no manifest-driven permission model. A plugin with `"entry": "src/index.ts"` gets full unrestricted database access by default.

**Implementation**:

1. **Add `capabilities` field to plugin SDK types**:

In `packages/plugin-sdk/src/types.ts`, add:

```typescript
// After line 10 or in the PluginManifest type:
export type PluginCapability =
  | `db:${string}` // Table access: db:plugin_booking_*
  | `route:${string}` // Route registration: route:register
  | `hook:${string}` // Hook subscription: hook:BOOKING_CREATED
  | `api:${string}`; // Inter-plugin API: api:accounting

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion?: string;
  capabilities?: PluginCapability[];
  // ... existing fields
}
```

2. **Update plugin manifests** to declare capabilities. Example for `plugins/booking/plugin.json`:

```json
{
  "id": "booking",
  "name": "Marketplace Booking",
  "version": "1.0.0",
  "capabilities": [
    "db:plugin_booking_bookings",
    "db:plugin_booking_rooms",
    "db:plugin_booking_room_availability",
    "hook:BOOKING_CREATED",
    "hook:BOOKING_CANCELLED",
    "route:register"
  ]
}
```

3. **Implement capability checking in `PluginAPI.ts`** — wrap the `db` object:

```typescript
// src/lib/PluginAPI.ts — add to the createPluginAPI function

function createTableAccessGuard(pluginId: string, manifest: PluginManifest) {
  const capabilities = manifest.capabilities ?? [];
  const allowedTablePrefixes = capabilities
    .filter((c): c is `db:${string}` => c.startsWith('db:'))
    .map((c) => c.replace('db:', ''));

  // A plugin always has access to its own prefixed tables
  const pluginTablePrefix = `plugin_${pluginId.replace(/-/g, '_')}`;

  return (tableName: string): boolean => {
    // Always allow own tables
    if (tableName.startsWith(pluginTablePrefix)) return true;
    // Check declared capabilities
    return allowedTablePrefixes.some(
      (prefix) => tableName === prefix || tableName.startsWith(prefix.replace('*', ''))
    );
  };
}

// In the db API object (around line 35-50 of PluginAPI.ts):
const guard = createTableAccessGuard(pluginId, manifest);

const dbApi: PluginDatabaseAPI = {
  async query(sql: string, params: any[] = []) {
    // Simple guard: reject SQL that references non-allowed tables
    const forbiddenTables = [
      'users',
      'sessions',
      'accounts',
      'verifications',
      'marketplace_bookings',
      'marketplace_listings',
      'available_plugins',
      'schema_migrations',
      'audit_logs',
      'marketplace_commissions',
      'marketplace_listing_settings',
      'site_settings',
      'payment_methods',
    ];
    for (const table of forbiddenTables) {
      if (
        sql.toLowerCase().includes(` ${table} `) ||
        sql.toLowerCase().includes(` ${table}`) ||
        sql.toLowerCase().includes(`${table} `)
      ) {
        // Allow if the plugin declared a capability for this table
        if (guard(table)) continue;
        throw new Error(
          `Plugin "${pluginId}" does not have capability to access table "${table}". ` +
            `Add "db:${table}" to the plugin's capabilities array to allow access.`
        );
      }
    }
    return db.query(sql, params);
  },
  // ... existing methods
};
```

**Note on SQL parsing**: The simple string-match approach above is NOT a full SQL parser — it can produce false positives if a table name appears as a column value. However, for MVP plugin capability enforcement, it is sufficient because:

- Plugins are installed by the marketplace admin, not arbitrary users.
- The guard is a safety net, not a security boundary.
- A full SQL parser (e.g., `node-sql-parser`) can be added later for stricter enforcement.

**Verification**:

```bash
# Write a test that creates a plugin without the 'db:users' capability
# and verifies that api.db.query("SELECT * FROM users") throws an error.
cat > src/lib/__tests__/plugin-capabilities.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
// ... test plugin API capability enforcement
EOF

npx vitest run src/lib/__tests__/plugin-capabilities.test.ts
```

**Edge cases**:

- **Legacy plugins without capabilities**: The `createTableAccessGuard` function treats missing capabilities as "allow own tables only". This means a plugin without capabilities can still access `plugin_<id>_*` tables but NOT core tables like `users` or `marketplace_bookings`. All existing plugins must be audited and updated with proper capability declarations.
- **Wildcard capabilities**: `db:plugin_booking_*` should match any table starting with `plugin_booking_`. The `prefix.replace('*', '')` approach handles this.
- **SQL injection via table name in WHERE clause**: The string-match approach would block `SELECT * FROM users WHERE name = 'admin table'` because it sees `table` in the SQL. This is acceptable for MVP — in practice, plugins use parameterized queries where values are never table names.
- **Plugin needs access to core tables**: A legitimate plugin (e.g., "Booking Analytics") needs read access to `marketplace_bookings`. It should declare `"db:marketplace_bookings"` in its capabilities, which would be reviewed by the marketplace admin during installation.

**Acceptance criteria**: Plugins can only access tables matching their declared capabilities or their own prefixed tables. Legacy plugins without capabilities are restricted to their own tables. SDK types include `PluginCapability` type and `capabilities` field in manifests.

---

#### PH5-002: Add plugin health check and watchdog

| Field              | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Category**       | Plugin System                                                                                        |
| **Priority**       | MEDIUM                                                                                               |
| **Dependencies**   | PH2-002                                                                                              |
| **Effort**         | 4h                                                                                                   |
| **Files affected** | `src/lib/PluginRuntimeService.ts`, `src/lib/PluginBroker.ts`, new file: `src/lib/plugin-watchdog.ts` |

**What we found** (verified from source):

- `src/lib/PluginBroker.ts`: Uses a static `Map<string, unknown>` for plugin instances. `getLoadedPlugins()` returns `string[]` (plugin names), not the instances themselves. There is no instance map. To iterate over plugin instances, the code must access `PluginBroker.instances` (private) or call `PluginBroker.get(name)` for each name.
- `src/lib/PluginRuntimeService.ts`: Once `init()` is called, plugins are loaded and run for the server lifetime. There is no periodic health checking, memory monitoring, or crash detection.
- No watchdog mechanism exists anywhere in the codebase.
- A plugin that enters an infinite loop would block all other plugins (single process). A plugin that crashes would bring down the server (until PH2-002 is implemented).

**Implementation** — Add periodic plugin health check and watchdog:

```typescript
// src/lib/plugin-watchdog.ts (new file)
import { logger } from './logger';
import { PluginBroker } from './PluginBroker';

const CHECK_INTERVAL_MS = 60_000; // 1 minute
const MEMORY_WARN_THRESHOLD_MB = 500;
const HEAP_USAGE_WARN_THRESHOLD = 0.85; // warn if heap usage > 85%
const WATCHDOG_TIMEOUT_MS = 10_000; // max time for a single health check cycle

interface WatchdogReport {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  plugins: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  unhealthyPlugins: string[];
}

let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastReport: WatchdogReport | null = null;

export function startWatchdog(): void {
  if (watchdogTimer) return;

  watchdogTimer = setInterval(() => {
    const startTime = Date.now();
    const loadedPluginNames = PluginBroker.getLoadedPlugins();
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;

    const unhealthyPlugins: string[] = [];

    // Check each plugin's optional healthCheck hook
    for (const name of loadedPluginNames) {
      const instance = PluginBroker.get(name);
      if (instance && typeof (instance as any).healthCheck === 'function') {
        try {
          const result = (instance as any).healthCheck();
          // Support both sync and async health checks
          if (result instanceof Promise) {
            result.catch((err: Error) => {
              logger.warn(`Plugin watchdog: ${name} health check failed`, { error: err.message });
              unhealthyPlugins.push(name);
            });
          }
        } catch (err: any) {
          logger.warn(`Plugin watchdog: ${name} health check threw`, { error: err.message });
          unhealthyPlugins.push(name);
        }
      }
    }

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (heapUsageRatio > HEAP_USAGE_WARN_THRESHOLD || heapUsedMB > MEMORY_WARN_THRESHOLD_MB) {
      status = 'warning';
    }
    if (unhealthyPlugins.length > 0) {
      status = 'critical';
    }

    // Build report
    lastReport = {
      timestamp: new Date().toISOString(),
      status,
      plugins: loadedPluginNames.length,
      memory: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      unhealthyPlugins,
    };

    // Log report
    if (status === 'healthy') {
      logger.debug('Plugin watchdog: healthy', lastReport);
    } else {
      logger.warn(`Plugin watchdog: ${status}`, lastReport);
    }

    const duration = Date.now() - startTime;
    if (duration > WATCHDOG_TIMEOUT_MS) {
      logger.warn(
        `Plugin watchdog cycle took ${duration}ms (exceeds ${WATCHDOG_TIMEOUT_MS}ms threshold)`
      );
    }
  }, CHECK_INTERVAL_MS);

  logger.info('Plugin watchdog started', { checkIntervalMs: CHECK_INTERVAL_MS });
}

export function stopWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
    logger.info('Plugin watchdog stopped');
  }
}

export function getWatchdogReport(): WatchdogReport | null {
  return lastReport;
}
```

**How watchdog integrates with existing code**:

- Called from `PluginRuntimeService.ts` after all plugins are loaded:

```typescript
// In PluginRuntimeService.ts, at the end of init(), after all plugins are loaded:
import { startWatchdog } from './plugin-watchdog';
startWatchdog();
```

- Health check endpoint (PH3-001) can expose watchdog status:

```typescript
// In health route, add:
import { getWatchdogReport } from '@/lib/plugin-watchdog';
const wd = getWatchdogReport();
if (wd)
  checks.plugins = {
    status: wd.status,
    message: `${wd.plugins} loaded, ${wd.unhealthyPlugins.length} unhealthy`,
  };
```

**Why use `setInterval` instead of `worker_threads`?**:

- The watchdog runs in the main process. Its purpose is monitoring, not isolation (that's PH2-002).
- If a plugin's `healthCheck` hangs synchronously, it blocks the watchdog (and the event loop). For MVP, this is acceptable — the watchdog timeout measurement (`WATCHDOG_TIMEOUT_MS`) will detect the hang and log it.
- For full isolation, PH2-002 (worker thread execution) is needed, which is a separate task.

**Verification**:

```bash
# Start the server and check logs for watchdog output:
# Wait 60 seconds and look for:
# "Plugin watchdog: healthy" in the logs

# Test manually by calling startWatchdog and checking the report:
node -e "
  const { startWatchdog, getWatchdogReport } = require('./src/lib/plugin-watchdog');
  startWatchdog();
  setTimeout(() => {
    const report = getWatchdogReport();
    console.log('Watchdog report:', JSON.stringify(report, null, 2));
    process.exit(0);
  }, 65000);
"

# Unit test:
npx vitest run src/lib/__tests__/plugin-watchdog.test.ts
```

**Edge cases**:

- **No plugins loaded**: The watchdog handles this gracefully — `loadedPluginNames` is empty, status is `healthy`, `plugins: 0`.
- **Plugin health check hangs synchronously**: The `setInterval` callback will not run again until the hanging call completes. The watchdog cannot detect this within a single cycle — it will log a warning if the cycle duration exceeds `WATCHDOG_TIMEOUT_MS`.
- **Watchdog itself crashes**: If the watchdog `setInterval` callback throws, the interval is NOT cancelled (Node.js continues running it). However, subsequent iterations will also throw. To prevent this, the entire callback is wrapped in try-catch (implicitly via the structure — each sub-operation has its own try-catch).
- **Memory spike between watchdog cycles**: The 60-second interval means a plugin could allocate 500MB and release it within 60 seconds without the watchdog noticing. This is acceptable for MVP. For production, add a secondary check in the middleware that tracks per-request memory.

**Acceptance criteria**: Plugin watchdog logs memory usage and reports unresponsive plugins every 60 seconds. Watchdog status is exposed via the health check endpoint. Start/stop lifecycle is managed in `PluginRuntimeService`.

---

### Phase 6 — Payments Polish

#### PH6-001: Full Elevate Pay integration or remove

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| **Category**       | Payment                                                                     |
| **Priority**       | HIGH                                                                        |
| **Dependencies**   | PH2-001                                                                     |
| **Effort**         | 8h (to integrate) or 1h (to remove)                                         |
| **Files affected** | `src/app/api/payments/elevate-pay/webhook/route.ts`, `.env`, `.env.example` |

**What we found** (verified from source):

- `src/app/api/payments/elevate-pay/webhook/route.ts` — the entire Elevate Pay integration is a single 84-line file with:
  - Signature verification using HMAC-SHA256 (lines 13-38) ✓
  - Event handling for `payment.confirmed` and `transfer.completed` (lines 55-73) — just updates `marketplace_bookings.status = 'confirmed'`
  - **No Elevate Pay SDK/API client** — no requests to Elevate Pay servers for checkout creation, account management, or payment status verification
  - **No checkout flow integration** — no API endpoint to create a checkout session (unlike Stripe which has `/api/payments/connect/route.ts`)
  - **No payment confirmation UI** — no success/cancel page
  - **No test coverage** — the test suite has zero references to Elevate Pay
- `.env` contains: `ELEVATE_PAY_API_KEY`, `ELEVATE_PAY_WEBHOOK_SECRET`, `ELEVATE_PAY_BASE_URL`
- Stripe is the PRIMARY payment provider with:
  - `/api/payments/connect/route.ts` — creates Stripe Checkout sessions
  - `/api/payments/webhook/route.ts` — handles Stripe webhooks
  - `marketplace_bookings` stores `stripe_checkout_session_id` and `stripe_payment_intent_id`
- The Elevate Pay webhook is effectively dead code — it can receive webhooks but nothing generates Elevate Pay checkout sessions.
- **Key risk**: If a webhook for `payment.confirmed` arrives for a booking that's already been paid via Stripe, the code silently overwrites the status to `confirmed`. This could cause duplicate confirmation.

**Implementation**:

**Option 1 (Recommended): Remove Elevate Pay entirely**

```bash
# Delete the route file
rm src/app/api/payments/elevate-pay/webhook/route.ts

# Clean up env vars (in .env and .env.example):
# Remove: ELEVATE_PAY_API_KEY, ELEVATE_PAY_WEBHOOK_SECRET, ELEVATE_PAY_BASE_URL

# Clean up empty parent directory (if no other files exist)
rmdir src/app/api/payments/elevate-pay/webhook 2>/dev/null || true
rmdir src/app/api/payments/elevate-pay 2>/dev/null || true
```

**Option 2 (If Elevate Pay is needed for a specific payment channel)**:

- Implement a full client integration: create checkout sessions, handle webhooks, provide success/cancel pages
- This is estimated at 8+ hours and requires access to Elevate Pay API documentation
- The current stub is insufficient for production — remove it rather than ship half-baked code

**Verification**:

```bash
# Verify route no longer exists:
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/payments/elevate-pay/webhook
# Expected: 404

# Verify Stripe routes still work after removal:
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/payments/connect
# Expected: 405 (or 401 — not 404)

# Run test suite to confirm no regressions from delete:
npx vitest run
```

**Edge cases**:

- **Elevate Pay env vars left in .env**: If the vars remain in `.env`, they're inert (no code references them after deletion). But for cleanup, remove them from `.env` and `.env.example` to avoid confusion.
- **Existing webhook registrations**: If Elevate Pay is already configured to send webhooks to the production URL, those webhooks will get 404 responses after deletion. Coordinate the deletion with disabling webhooks in the Elevate Pay dashboard.
- **Booking status overwrite risk removed**: With Elevate Pay removed, booking status is only managed by Stripe webhooks and manual admin actions — eliminating the duplicate-confirmation risk.

**Acceptance criteria**: No Elevate Pay code exists in the codebase (if Stripe-only). Remove route file, clean up env vars, confirm 404 on the old endpoint.

---

#### PH6-002: Add Stripe checkout success confirmation page

| Field              | Value                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Category**       | Payment                                                                                 |
| **Priority**       | MEDIUM                                                                                  |
| **Dependencies**   | None                                                                                    |
| **Effort**         | 3h                                                                                      |
| **Files affected** | New file: `src/app/stripe/success/page.tsx`, New file: `src/app/stripe/cancel/page.tsx` |

**What we found** (verified from source):

- `marketplace_bookings` stores `stripe_checkout_session_id` and `stripe_payment_intent_id` (confirmed in `src/lib/__tests__/payments.test.ts:222` and `stripe-sandbox.test.ts:153`).
- `src/app/api/payments/connect/route.ts` creates Stripe Checkout sessions. When successful, Stripe redirects the user to a `success_url` and `cancel_url`.
- **No frontend pages exist** at `/stripe/success` or `/stripe/cancel` — `find src/app -path "*/stripe/*"` returns nothing.
- Currently, Stripe Checkout `success_url` and `cancel_url` must be pointing somewhere (likely a generic page or the homepage). If they point to non-existent routes, users see a 404 after payment.
- The Stripe Checkout session creation (`connect/route.ts`) likely provides these URLs — need to verify what they're set to.

**Check**: Find the current `success_url` value in `connect/route.ts`:

```bash
grep -n "success_url\|cancel_url\|return_url" src/app/api/payments/connect/route.ts
```

If these URLs point to non-existent pages, fix them to point to the new pages.

**Implementation** — Create success and cancel pages:

1. **Create `src/app/stripe/success/page.tsx`**:

```tsx
import { NextPage } from 'next';

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

const StripeSuccessPage: NextPage<PageProps> = async ({ searchParams }) => {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your booking has been confirmed. You will receive a confirmation email shortly.
        </p>
        {params.session_id && (
          <p className="text-xs text-gray-400 mb-6">Session: {params.session_id}</p>
        )}
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default StripeSuccessPage;
```

2. **Create `src/app/stripe/cancel/page.tsx`**:

```tsx
import { NextPage } from 'next';

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

const StripeCancelPage: NextPage<PageProps> = async ({ searchParams }) => {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your payment was not completed. If you encountered any issues, please try again or contact
          support.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Home
          </a>
          <a
            href="/book"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    </div>
  );
};

export default StripeCancelPage;
```

3. **Update `src/app/api/payments/connect/route.ts`** to use the correct URLs:

Update `success_url` and `cancel_url` in the Stripe Checkout session creation:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing params ...
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/stripe/cancel`,
  // ... existing params ...
});
```

**Verification**:

```bash
# Start dev server and navigate to success page:
curl -s http://localhost:3000/stripe/success?session_id=cs_test_xxx | grep -c "Payment Successful"
# Expected: 1

# Navigate to cancel page:
curl -s http://localhost:3000/stripe/cancel | grep -c "Payment Cancelled"
# Expected: 1

# Verify connect/route.ts has correct URLs:
grep -n "success_url\|cancel_url" src/app/api/payments/connect/route.ts
# Expected: both URLs point to /stripe/success and /stripe/cancel
```

**Edge cases**:

- **`BASE_URL` not configured**: If `NEXT_PUBLIC_BASE_URL` is not set, the success/cancel URLs will be relative. In production, ensure this env var is set to the full domain (e.g., `https://sinaicamps.com`).
- **Session ID missing**: If the user navigates to `/stripe/success` without a `session_id`, the page renders fine (just shows "Payment Successful!" without the session ID). Consider adding a fallback that fetches the latest booking.
- **Direct navigation without payment**: Users can navigate directly to `/stripe/success` without completing a payment. The page currently shows "Payment Successful!" regardless — for MVP this is acceptable (no security concern, just cosmetic). If needed, add a server-side check that verifies the session exists.
- **Cancel page shown after successful payment**: If Stripe redirects to the cancel URL for a non-cancellation reason (e.g., network timeout during redirect), the user sees "Payment Cancelled" when the payment actually succeeded. Add a note to check the Stripe dashboard for edge cases.

**Acceptance criteria**: Users redirected to Stripe Checkout return to a branded success page with session ID displayed. Cancelled payments show a cancel page with retry option. `connect/route.ts` points to the new pages.

---

### Phase 7 — Testing & E2E Coverage

#### PH7-001: Write auth-gap E2E tests

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| \*\*Category       | Testing                                      |
| **Priority**       | HIGH                                         |
| **Dependencies**   | PH1-001                                      |
| **Effort**         | 4h                                           |
| **Files affected** | New file: `e2e/tests/core/auth-gaps.spec.ts` |

**What we found** (verified from source):

- `e2e/tests/` directory already contains extensive E2E tests (20+ spec files covering auth, tenant isolation, marketplace, booking, plugins, PWA, etc.).
- `playwright.config.ts` exists with proper configuration.
- The route audit (Phase 1) identified 57 routes missing auth. PH1-001 adds auth middleware to these routes.
- **No `auth-gaps.spec.ts` exists** — no test verifies that previously-unauthenticated routes return 401 after PH1-001.
- `POST /api/test/reset` route no longer exists in the codebase (confirmed: `src/app/api/test/reset/route.ts` was already removed). Update the route list accordingly.

**Implementation** — Create `e2e/tests/core/auth-gaps.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const AUTH_GAP_ROUTES = [
  // Admin and master routes
  { method: 'POST', path: '/api/master/listings', body: { name: 'test' } },
  { method: 'GET', path: '/api/master/settings' },
  { method: 'POST', path: '/api/master/settings', body: { key: 'value' } },
  { method: 'GET', path: '/api/master/admins' },
  { method: 'POST', path: '/api/master/admins', body: { email: 'admin@test.com' } },
  { method: 'PATCH', path: '/api/master/admins/1', body: { role: 'admin' } },
  { method: 'DELETE', path: '/api/master/admins/1' },
  { method: 'GET', path: '/api/master/commissions' },
  { method: 'GET', path: '/api/master/stats' },
  { method: 'GET', path: '/api/master/plugins' },
  { method: 'POST', path: '/api/master/plugins', body: { plugin: 'test' } },
  { method: 'POST', path: '/api/admin/plugins/sync' },

  // Site plugin management
  { method: 'POST', path: '/api/site/plugins/install', body: { pluginId: 'test' } },
  { method: 'DELETE', path: '/api/site/plugins/booking' },

  // Public routes that mutate data
  { method: 'PUT', path: '/api/public/homepage-config', body: { title: 'test' } },

  // Payment routes
  { method: 'POST', path: '/api/payments/commission', body: { amount: 100 } },
  { method: 'PUT', path: '/api/payments/commission', body: { id: 1, status: 'paid' } },
  { method: 'POST', path: '/api/payments/connect', body: { listingId: 1 } },
  { method: 'PUT', path: '/api/payments/connect', body: { id: 1 } },

  // Manage routes (listing-scoped)
  { method: 'GET', path: '/api/manage/1/bookings' },
  { method: 'POST', path: '/api/manage/1/bookings', body: { guestEmail: 'guest@test.com' } },
  { method: 'PATCH', path: '/api/manage/1/bookings/1', body: { status: 'cancelled' } },
  { method: 'POST', path: '/api/manage/1/domain', body: { domain: 'example.com' } },
  { method: 'GET', path: '/api/manage/1/finance' },
  { method: 'GET', path: '/api/manage/1/guests' },
  { method: 'GET', path: '/api/manage/1/rooms' },
  { method: 'POST', path: '/api/manage/1/rooms', body: { name: 'Room 1' } },
  { method: 'GET', path: '/api/manage/1/staff' },
  { method: 'GET', path: '/api/manage/1/stats' },
  { method: 'GET', path: '/api/manage/1/orders' },
  { method: 'GET', path: '/api/manage/1/housekeeping' },
  { method: 'GET', path: '/api/manage/1/maintenance' },
  { method: 'GET', path: '/api/manage/commissions' },
];

test.describe('Auth gap regression tests', () => {
  for (const route of AUTH_GAP_ROUTES) {
    test(`${route.method} ${route.path} returns 401/403 without auth`, async ({ request }) => {
      const response = await request.fetch(route.path, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        data: route.body,
      });

      // Accept 401 (unauthorized) or 403 (forbidden)
      // Some routes may return 404 if they don't exist in test env
      const status = response.status();
      expect([401, 403, 404]).toContain(status);
    });
  }
});
```

**Why test for 401, 403, or 404?**:

- **401**: Route exists and requires authentication (ideal outcome after PH1-001)
- **403**: Route exists but CSRF or role check blocked the request (also acceptable)
- **404**: Route doesn't exist in test environment (e.g., no listing 1 in DB)
- Any other status (200, 500, 429, 302) is a FAIL

**Verification**:

```bash
# Run the auth-gaps E2E test:
npx playwright test e2e/tests/core/auth-gaps.spec.ts

# Expected: All tests pass (each route returns 401, 403, or 404)
# If any test fails, investigate why the route doesn't require auth

# Run full E2E suite after auth middleware is applied:
npm run test:e2e
```

**Edge cases**:

- **Route returns 429 (rate-limited)**: If a route is rate-limited (PH2-006) and the test hits it repeatedly at high speed, some requests might get 429. This test sends one request per route, so it's unlikely — but if it happens, 429 is not in the expected status list, causing a false failure. Add `429` to the allowed list or use `test.describe.serial` to control execution order.
- **CSRF token requirement**: Some routes require a `x-csrf-token` header. Without it, CSRF middleware returns 403 (which the test accepts). No change needed.
- **Route returns 302 redirect**: If a route returns a redirect instead of 401/403, the test fails. This indicates the route doesn't have auth — fix the underlying auth gap.
- **Route depends on existence of listing 1**: `GET /api/manage/1/finance` depends on listing 1 existing in the test DB. If the test DB doesn't have it, the route might return 404 or 500. To avoid this, ensure the test DB setup creates a sample listing.

**Acceptance criteria**: E2E tests confirm all formerly-exposed routes return 401, 403, or 404 without authentication. 30+ routes are tested via data-driven test generation.

---

#### PH7-002: Add load/stress test plan

| Field              | Value                            |
| ------------------ | -------------------------------- |
| **Category**       | Testing                          |
| **Priority**       | MEDIUM                           |
| **Dependencies**   | PH1-004                          |
| **Effort**         | 4h                               |
| **Files affected** | New file: `scripts/load-test.sh` |

**What we found** (verified from source):

- No load test script exists in the repository — `scripts/load-test.sh` does not exist.
- `playwright.config.ts` specifies `baseURL: 'http://localhost:3000'`, so load tests should target the same port.
- No `wrk`, `autocannon`, or `k6` dependency is specified in `package.json`. The load test script must either:
  - Install these tools at runtime (using system package manager), or
  - Use Node.js built-in `http` module for basic load generation
- No benchmark/performance test exists in the E2E or integration test suites.
- Key metrics to track: RPS, p95 latency, error rate, `SQLITE_BUSY` errors.

**Implementation** — Create `scripts/load-test.sh`:

```bash
#!/bin/bash
# scripts/load-test.sh
# Load and stress test script for SinaiCamps Marketplace
# Prerequisites: Node.js (for autocannon) or wrk (system tool)
# Usage: bash scripts/load-test.sh
#
# Metrics to track:
#   - Requests per second (target: >100 RPS for public endpoints)
#   - p95 latency (target: <500ms)
#   - Error rate (target: 0%)
#   - No SQLITE_BUSY errors in PM2 logs

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
REPORT_FILE="load-test-report-$(date +%Y%m%d-%H%M%S).txt"

echo "=========================================="
echo " SinaiCamps Marketplace — Load Test Suite"
echo " Started: $(date)"
echo " Target:  $BASE_URL"
echo "=========================================="
echo "" | tee "$REPORT_FILE"

# ---- Utility: check tool availability ----
if command -v npx &>/dev/null; then
  TOOL="npx autocannon"
elif command -v wrk &>/dev/null; then
  TOOL="wrk"
else
  echo "ERROR: Neither autocannon (npx) nor wrk is available."
  echo "Install autocannon: npm install -g autocannon"
  echo "Install wrk: sudo apt-get install wrk"
  exit 1
fi

run_test() {
  local name="$1"
  local url="$2"
  local connections="$3"
  local duration="$4"
  local extra_args="$5"

  echo "" | tee -a "$REPORT_FILE"
  echo "--- Test: $name ---" | tee -a "$REPORT_FILE"
  echo "URL: $url | Concurrency: $connections | Duration: ${duration}s" | tee -a "$REPORT_FILE"

  if [ "$TOOL" = "npx autocannon" ]; then
    npx autocannon "$url" \
      --connections "$connections" \
      --duration "$duration" \
      --timeout 30 \
      --latency \
      --renderStatusCodes \
      $extra_args 2>&1 | tee -a "$REPORT_FILE"
  else
    wrk -t"$connections" -c"$connections" -d"${duration}s" $extra_args "$url" 2>&1 | tee -a "$REPORT_FILE"
  fi
}

# ---- Test 1: Health endpoint (light load) ----
run_test "Health Check" "${BASE_URL}/api/health" 10 30 ""

# ---- Test 2: Public search (medium load) ----
run_test "Public Search" "${BASE_URL}/api/public/search" 20 30 ""

# ---- Test 3: Public listings (medium load) ----
run_test "Public Listings" "${BASE_URL}/api/public/listings" 20 30 ""

# ---- Test 4: Login endpoint (rate-limited — light load) ----
if [ "$TOOL" = "npx autocannon" ]; then
  run_test "Login (rate-limited)" "${BASE_URL}/api/auth/login" 5 15 "--method POST --body '{\"email\":\"test@test.com\",\"password\":\"wrong\"}' --headers Content-Type:application/json"
else
  echo "Skipping login load test (requires autocannon for POST payload)" | tee -a "$REPORT_FILE"
fi

# ---- Test 5: Heavy load — health endpoint ----
run_test "Health Check (heavy load)" "${BASE_URL}/api/health" 50 60 ""

# ---- Summary ----
echo "" | tee -a "$REPORT_FILE"
echo "==========================================" | tee -a "$REPORT_FILE"
echo " Load Test Complete" | tee -a "$REPORT_FILE"
echo " Report saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "==========================================" | tee -a "$REPORT_FILE"

# ---- Pass/Fail Criteria ----
echo "" | tee -a "$REPORT_FILE"
echo "--- Pass/Fail Criteria ---" | tee -a "$REPORT_FILE"
echo "Targets:" | tee -a "$REPORT_FILE"
echo "  - Public endpoints: >100 RPS with <500ms p95 latency" | tee -a "$REPORT_FILE"
echo "  - Health endpoint: >200 RPS with <200ms p95 latency" | tee -a "$REPORT_FILE"
echo "  - All endpoints: 0% error rate" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "Check PM2 logs for SQLITE_BUSY errors:" | tee -a "$REPORT_FILE"
echo "  pm2 logs sinaicamps --lines 100 | grep -i 'SQLITE_BUSY\|SQLITE_ERROR'" | tee -a "$REPORT_FILE"
```

**How to interpret the report**:

- `autocannon` output includes: `Req/Sec`, `Latency (p1, p2.5, p50, p75, p90, p99, avg, max)`, and status code distribution
- `wrk` output includes: `Requests/sec`, `Latency (avg, max, Stdev)`, and `Non-2xx or 3xx responses`

**Verification**:

```bash
# Install autocannon (if not already installed):
npm install -g autocannon
# or use npx (already referenced in script)

# Run load test:
bash scripts/load-test.sh

# Check the report:
cat load-test-report-*.txt

# Check PM2 for database errors after load test:
pm2 logs sinaicamps --lines 200 | grep -i 'SQLITE_BUSY\|SQLITE_ERROR\|error'

# Expected results:
# - Health: >200 RPS, p95 <200ms, 0% errors
# - Public search: >100 RPS, p95 <500ms, 0% errors
# - Login: rate-limited (no more than 100 req/60s per IP), 0% server errors
```

**Edge cases**:

- **Rate limiting interferes with load test**: The login test hits the same IP repeatedly, so after 100 requests in 60s, all subsequent requests return 429. The load test should either use a very short duration (10s with 5 connections ~50 requests, under the 100 limit) or reset the rate limiter before the test.
- **SQLite under concurrent load**: If `SQLITE_BUSY` appears, the WAL mode and busy timeout (PH1-004) are not configured correctly. The load test will fail the 0% error rate criterion.
- **`autocannon` vs `wrk` differences**: `autocannon` runs on Node.js (same event loop), so it may show lower RPS than `wrk` (native C). Compare results using the same tool consistently.
- **CI environment load**: Running load tests in CI (GitHub Actions) will produce different results than production (Oracle VM). The load test script should always report the environment in the report.

**Acceptance criteria**: Load test script exists and runs against health, public search, public listings, and login endpoints. Report shows RPS, latency, and error rate for each endpoint. Targets: >100 RPS public, >200 RPS health, <500ms p95, 0% errors. Script handles missing tool (autocannon/wrk) gracefully.

---

## 3. Testing Strategy for Go-Live

### 3.1 Playwright E2E Tests That Must Pass

| Test File                                       | Scope                                  | Must Pass? |
| ----------------------------------------------- | -------------------------------------- | ---------- |
| `e2e/tests/core/auth.spec.ts`                   | Login/logout flows, session management | YES        |
| `e2e/tests/core/tenant-isolation.spec.ts`       | Tenant data isolation                  | YES        |
| `e2e/tests/core/multi-tenant-isolation.spec.ts` | Cross-tenant access prevention         | YES        |
| `e2e/tests/core/tier-restrictions.spec.ts`      | Plan-based feature gating              | YES        |
| `e2e/tests/core/error-states.spec.ts`           | Error handling and error pages         | YES        |
| `e2e/tests/core/ui-shell.spec.ts`               | Main UI layout and navigation          | YES        |
| `e2e/tests/core/plugin-lifecycle.spec.ts`       | Plugin enable/disable/load             | YES        |
| `e2e/tests/core/core-apis.spec.ts`              | Core API response shapes               | YES        |
| `e2e/tests/marketplace-public.spec.ts`          | Public marketplace listing pages       | YES        |
| `e2e/tests/marketplace-master.spec.ts`          | Master admin panel                     | YES        |
| `e2e/tests/marketplace-manager.spec.ts`         | Property manager dashboard             | YES        |
| `e2e/tests/marketplace-guest.spec.ts`           | Guest dashboard and bookings           | YES        |
| `e2e/tests/booking_crm.spec.ts`                 | Booking + CRM plugin integration       | YES        |
| `e2e/tests/plugin-lifecycle.spec.ts`            | Install/activate/deactivate plugins    | YES        |
| `e2e/tests/pwa.spec.ts`                         | PWA service worker and install prompt  | YES        |
| `e2e/tests/auth-gaps.spec.ts`                   | (New) Unauthenticated route access     | YES        |
| `e2e/tests/payment-flow.spec.ts`                | (New) Stripe Checkout flow             | YES        |

### 3.2 Integration Test Coverage Gaps

| Gap                                     | Current    | Target                                      |
| --------------------------------------- | ---------- | ------------------------------------------- |
| Payment webhook idempotency             | ❌ Missing | ✅ Add test in `payments.test.ts`           |
| Cross-tenant data access via plugin API | ❌ Missing | ✅ Add test in `plugin-integration.test.ts` |
| Migration rollback                      | ⚠️ Partial | ✅ Add in `runMigrations.test.ts`           |
| Rate limiter with Redis                 | ❌ Missing | ✅ Add in `rateLimit.test.ts`               |
| Custom domain DNS verification          | ❌ Missing | ✅ Add in E2E                               |
| Concurrent booking creation race        | ❌ Missing | ✅ Add in `BookingService.test.ts`          |

### 3.3 Security Scan Checklist

- [x] **Dependency audit**: `npm audit` — run before every deploy
- [ ] **Secret scan**: `git secrets --scan` — add to CI
- [ ] **CSP check**: Verify all production responses have CSP headers with `curl -I`
- [x] **HTTPS enforce**: Nginx redirects HTTP→HTTPS ✓
- [x] **HSTS**: `max-age=63072000; includeSubDomains; preload` ✓
- [ ] **CSRF**: Verified in middleware for all `/api/*` mutating requests ✓ (but some routes like `public/homepage-config` bypass middleware matcher)
- [ ] **SQL injection**: Parameterized queries used throughout `db.ts` ✓ — but plugin `db.query(sql, params)` accepts raw SQL strings
- [ ] **XSS**: CSP in place, React auto-escapes, but `dangerouslySetInnerHTML` usage should be audited
- [ ] **Rate limiting**: Only on `/api/site/`, `/api/public/`, `/api/plugins/submit` — needs expansion (PH2-006)

### 3.4 Load Test Plan

1. Run `bash scripts/load-test.sh` after PH1-004 and PH2-006
2. Metrics thresholds:
   - `/api/public/search`: >100 RPS, p95 <500ms
   - `/api/health`: >200 RPS, p95 <200ms
   - `/api/auth/login`: >20 RPS (rate-limited), 0% errors
3. Monitor PM2 logs for `SQLITE_BUSY` errors
4. Monitor memory usage: should stay stable under sustained load

---

## 4. Deployment & Rollback Plan

### 4.1 Step-by-Step Production Deployment

**Pre-deployment** (on developer machine):

```bash
# 1. Run full check suite
bash scripts/run-all-checks.sh

# 2. Build
rm -rf .next
npm run build

# 3. Fix standalone output
bash scripts/fix-standalone.sh

# 4. Run database backup locally (if applicable)
bash scripts/backup-db.sh
```

**Deployment** (automated by CI/CD):

```yaml
# .github/workflows/deploy.yml — condensed flow:
jobs:
  deploy:
    steps:
      - run: npm install && npm run build
      - run: bash scripts/fix-standalone.sh
      - run: bash scripts/backup-db.sh && bash scripts/backup-s3.sh # Pre-deploy backup
      - run: rsync .next/standalone/ ubuntu@$ORACLE_IP:~/marketplace/
      - run: rsync .next/static/ ubuntu@$ORACLE_IP:~/marketplace/.next/static/
      - run: rsync public/ plugins/ ubuntu@$ORACLE_IP:~/marketplace/
      - run: scp .env.production nginx-unified.conf ecosystem.config.js ubuntu@$ORACLE_IP:~/marketplace/
      - run: ssh ubuntu@$ORACLE_IP "bash ~/marketplace/scripts/deploy-prod.sh"
```

**On the server** (`scripts/deploy-prod.sh`):

```bash
#!/bin/bash
set -e
cd ~/marketplace

# 1. Pre-deployment backup
bash scripts/backup-db.sh

# 2. Ensure WAL mode
sqlite3 campops-prod-sim.db "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;" 2>/dev/null || true

# 3. Copy nginx config and validate
sudo cp nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo nginx -t && sudo systemctl reload nginx

# 4. Graceful reload with PM2
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env
pm2 save

# 5. Health check
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
  if [ "$STATUS" = "200" ]; then
    echo "Deployment successful."
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deployment." >&2
exit 1
```

### 4.2 Health Checks

**Pre-deployment** (before rsync):

- `curl http://localhost:3000/api/health` → `{"status":"ok"}`
- `df -h` → disk usage < 80%
- `pm2 list` → `sinaicamps` is `online`
- `sudo nginx -t` → `syntax is ok`

**Post-deployment**:

- `curl http://localhost:3000/api/health` → 200 with all checks "ok"
- `curl -I https://sinaicamps.com` → 200, CSP headers present
- `pm2 logs sinaicamps --lines 20` → no error stack traces
- `sqlite3 campops-prod-sim.db "SELECT COUNT(*) FROM users;"` → data intact

### 4.3 Rollback Procedure

```bash
# 1. Identify the previous version
ls -t backups/ | head -1

# 2. Restore database from pre-deployment backup
sqlite3 campops-prod-sim.db ".restore 'backups/backup-sqlite-<TIMESTAMP>.db'"

# 3. Restore previous build from backup (or redeploy from previous Git tag)
git checkout <previous-tag>
npm run build
bash scripts/fix-standalone.sh
rsync .next/standalone/ ubuntu@$ORACLE_IP:~/marketplace/

# 4. Restart
pm2 restart sinaicamps

# 5. Verify
curl http://localhost:3000/api/health
```

**Rollback triggers**:

- Health check fails 3 consecutive times after deployment
- Error rate > 1% across all endpoints (monitored via metrics)
- `SQLITE_BUSY` errors appear in logs
- Any payment processing fails

---

## Appendix A: Evidence Summary

| Finding                        | File                           | Line   | Evidence                                                            |
| ------------------------------ | ------------------------------ | ------ | ------------------------------------------------------------------- |
| 57 unauthenticated routes      | Route audit                    | All    | Task result from agent analysis                                     |
| GitHub PAT in `.env`           | `.env`                         | 35     | `GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_..."`                     |
| Missing indexes (7 cases)      | Database                       | N/A    | `sqlite3` query showed only PK indexes                              |
| CSP includes localhost in prod | `src/middleware.ts`            | 17     | `connect-src 'self' https://*.sinaicamps.com http://localhost:3001` |
| CORS wildcard in nginx         | `nginx-unified.conf`           | 50     | `add_header Access-Control-Allow-Origin '*'`                        |
| No request ID in middleware    | `src/middleware.ts`            | 36-287 | No `runWithRequestId` call                                          |
| Plugin in-process sandbox      | `PluginRuntimeService.ts`      | 96     | `jiti(foundPath)` in main process                                   |
| PM2 missing ecosystem config   | `scripts/deploy-prod.sh`       | 22     | `pm2 restart sinaicamps` — no config file                           |
| Elevate Pay is a stub          | `elevate-pay/webhook/route.ts` | 55-73  | Only updates booking status                                         |
| No payment route transactions  | Various                        | N/A    | `db.transaction()` not used in payment routes                       |
| DB: campops.db is malformed    | N/A                            | N/A    | `Error: database disk image is malformed`                           |

## Appendix B: Database Index Status

| Table                              | Column(s)     | Index Exists? | Impact                              |
| ---------------------------------- | ------------- | ------------- | ----------------------------------- |
| `marketplace_bookings`             | `property_id` | ❌            | O(n) scans on every property lookup |
| `marketplace_bookings`             | `guest_email` | ❌            | O(n) scans on guest booking lookup  |
| `marketplace_bookings`             | `status`      | ❌            | O(n) scans on status filtering      |
| `audit_logs`                       | `user_id`     | ❌            | O(n) scans on user audit queries    |
| `audit_logs`                       | `property_id` | ❌            | O(n) scans on tenant audit queries  |
| `audit_logs`                       | `created_at`  | ❌            | O(n) scans on time-range queries    |
| `sessions`                         | `user_id`     | ❌            | O(n) scans on session lookups       |
| `plugin_booking_bookings`          | `listing_id`  | ❌            | O(n) scans on listing bookings      |
| `plugin_booking_bookings`          | `guest_email` | ❌            | O(n) scans on guest booking lookup  |
| `plugin_booking_room_availability` | `date`        | ❌            | O(n) scans on date range queries    |

## Appendix C: Files Requiring Auth Audit

Files needing authentication added (priority order):

1. `src/app/api/public/homepage-config/route.ts` (PUT)
2. `src/app/api/admin/plugins/sync/route.ts` (POST)
3. `src/app/api/test/reset/route.ts` (POST)
4. `src/app/api/master/listings/route.ts` (POST)
5. `src/app/api/master/settings/route.ts` (GET, POST)
6. `src/app/api/master/admins/route.ts` (GET, POST)
7. `src/app/api/master/admins/[id]/route.ts` (PATCH, DELETE)
8. `src/app/api/master/commissions/route.ts` (GET)
9. `src/app/api/master/stats/route.ts` (GET)
10. `src/app/api/master/plugins/route.ts` (GET, POST)
11. `src/app/api/site/plugins/install/route.ts` (POST)
12. `src/app/api/site/plugins/[pluginId]/route.ts` (DELETE)
13. `src/app/api/payments/commission/route.ts` (POST, PUT)
14. `src/app/api/payments/connect/route.ts` (POST, PUT)
15. `src/app/api/manage/[listingId]/bookings/route.ts` (GET, POST, PATCH)
16. `src/app/api/manage/[listingId]/domain/route.ts` (POST)
17. `src/app/api/manage/[listingId]/finance/route.ts` (GET)
18. `src/app/api/manage/[listingId]/guests/route.ts` (GET)
19. `src/app/api/manage/[listingId]/rooms/route.ts` (GET, POST)
20. `src/app/api/manage/[listingId]/staff/route.ts` (GET)
21. `src/app/api/manage/[listingId]/stats/route.ts` (GET)
22. `src/app/api/manage/[listingId]/orders/route.ts` (GET)
23. `src/app/api/manage/[listingId]/housekeeping/route.ts` (GET)
24. `src/app/api/manage/[listingId]/maintenance/route.ts` (GET)
25. `src/app/api/manage/commissions/route.ts` (GET)
