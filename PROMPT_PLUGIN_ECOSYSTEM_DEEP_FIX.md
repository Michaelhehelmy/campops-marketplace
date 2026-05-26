# OpenCode Agent Prompt: Plugin Ecosystem Deep-Fix + Paymob Integration Hardening

## Mission

Perform a complete deep audit of the plugin ecosystem (all components, hooks, loader, runtime, tests) and fix every known issue. Then perform a full, documentation-accurate rewrite of the Paymob payment plugin using the live Paymob Accept API docs.

**Scope**: plugins/, src/lib/Plugin*.ts, src/lib/hooks.ts, src/lib/PluginAPI.ts, plugin tests, and the Paymob integration end-to-end.

**DO NOT touch**: middleware, auth, database schema (core tables), or non-plugin routes.

---

## Part 0 — Read Before You Write

### Read These Files First
```
src/lib/PluginLoader.ts           — activate(), deactivate(), scan(), init()
src/lib/PluginRuntimeService.ts   — dynamic jiti loading at runtime
src/lib/PluginAPI.ts              — makePluginAPI(), ScopedRepository, all API methods
src/lib/PluginBroker.ts           — cross-plugin communication bus
src/lib/hooks.ts                  — hookManager, doAction, applyFilters, Hooks constants
src/lib/plugin-watchdog.ts        — crash recording, health reporting
src/lib/plugin-sandbox.ts         — capability enforcement
packages/plugin-sdk/src/types.ts  — PluginAPI interface, all SDK types
plugins/paymob/src/               — entire paymob plugin
src/lib/__tests__/plugin-ecosystem.test.ts
src/lib/__tests__/plugin-inits.test.ts
src/lib/__tests__/plugin-loader.test.ts
AGENT_LOGBOOK.md                  — recent changes and warnings
```

### Read Paymob Documentation (REQUIRED)
Before touching any Paymob code, read the live Paymob Accept API documentation:
- **Authentication**: https://docs.paymob.com/docs/accept-standard-integration  
- **Orders API**: https://docs.paymob.com/docs/orders  
- **Payment Keys**: https://docs.paymob.com/docs/payment-keys  
- **HMAC Verification**: https://docs.paymob.com/docs/hmac-calculation  
- **Transaction Inquiry**: https://docs.paymob.com/docs/transaction-inquiry  
- **Webhooks (Transaction Processed Callback)**: https://docs.paymob.com/docs/transaction-processed-callback  
- **Refund API**: https://docs.paymob.com/docs/refund-a-transaction  
- **Void API**: https://docs.paymob.com/docs/void-a-transaction  
- **Accept v2 (new API)**: https://docs.paymob.com/docs/accept-api-v2  

Do NOT guess at API shapes. If documentation contradicts the current types.ts — the docs win.

### Run Baseline Tests
```bash
npm test 2>&1 | tail -20
```
Expected: **1165 pass, 0 fail** (all green as of 2026-05-25).
Your target: maintain this or improve — zero regressions.

---

## Part 1 — Plugin Ecosystem Test Status

### ✅ Already Resolved (1165/1165 pass, 130/130 files green)

**What was fixed**: `plugin-ecosystem.test.ts > Plugin Analytics > should track plugin events`

**Actual root cause**: The test's `ORDER BY created_at` was non-deterministic — all 3 INSERT statements omitted `created_at` (NULL for all rows), and TEXT UUID primary keys provided no reliable sort order. Row order was unpredictable across SQLite page layouts.

**Fix applied**: `src/lib/__tests__/plugin-ecosystem.test.ts:482` — changed `ORDER BY created_at` to `ORDER BY rowid`. SQLite's hidden `rowid` column guarantees insertion order regardless of column values.

**DO NOT** add analytics writes to `PluginLoader.activate()` — the test manually inserts its own analytics rows and tests DB ordering only. No production code change was needed.

Verify the suite is still green before proceeding:
```bash
npm test 2>&1 | tail -5
# Expected: 1165 pass, 0 fail
```

---

## Part 2 — Plugin Ecosystem Comprehensive Audit

### 2.1 Missing `plugin.json` for `owner` plugin

**File**: `plugins/owner/` — no `plugin.json` exists. The logbook warns this breaks `PluginLoader.scan()`.

Create `plugins/owner/plugin.json`:
```json
{
  "id": "owner",
  "name": "Property Owner",
  "version": "1.0.0",
  "description": "Enables property owner registration, profile management, and plan upgrades.",
  "author": "SinaiCamps Core",
  "apiVersion": "^2.0.0",
  "campopsVersion": "^1.0.0",
  "entry": "src/index.ts",
  "planRequirement": "basic",
  "reviewStatus": "approved",
  "slots": {
    "owner.dashboard": ["owner:OwnerDashboard"],
    "marketplace.nav": ["owner:OwnerNav"]
  }
}
```

Then verify `PluginLoader.scan()` no longer logs a warning for this plugin:
```bash
grep -n "No plugin.json" src/lib/PluginLoader.ts   # understand the log site
npx vitest run src/lib/__tests__/plugin-loader.test.ts 2>&1
```

### 2.2 Audit `PluginAPI.registerHook` vs `Hooks` constants

**Current state**: Some plugins call `api.registerHook('payment.on_success', ...)` (dot notation) while `hooks.ts` defines `PAYMENT_ON_SUCCESS: 'payment:success'` (colon notation). This means hooks registered with the wrong key name silently do nothing.

**File**: `src/lib/PluginAPI.ts` — read `registerHook` implementation.

For each plugin, scan for `api.registerHook` calls and verify the hook name matches a constant in `src/lib/hooks.ts`:

```bash
grep -rn "registerHook(" plugins/ --include="*.ts" | grep -v ".test."
```

Cross-reference every hook name used against `src/lib/hooks.ts` Hooks constants. Fix any mismatches.

Known issue in `plugins/paymob/src/index.ts`:
- `'payment.collect_methods'` → check if `Hooks.PAYMENT_COLLECT_METHODS` or similar exists
- `'payment.on_success'` → correct key is `Hooks.PAYMENT_ON_SUCCESS = 'payment:success'`

Fix `plugins/paymob/src/index.ts` to use correct hook names.

### 2.3 Audit PluginAPI `db.tableExists`

**File**: `plugins/paymob/src/index.ts:23` calls `api.db.tableExists('transactions')`.

Check if `tableExists` is defined in `packages/plugin-sdk/src/types.ts` `PluginDatabaseAPI` interface AND implemented in `src/lib/PluginAPI.ts`. If missing from either:

1. Add to `PluginDatabaseAPI` interface in `packages/plugin-sdk/src/types.ts`:
```typescript
tableExists(tableName: string): Promise<boolean>;
```

2. Add implementation in `src/lib/PluginAPI.ts` inside `makePluginAPI` → `db` object:
```typescript
async tableExists(tableName: string): Promise<boolean> {
  const prefixed = tableName.startsWith('plugin_') ? tableName : `plugin_${pluginId}_${tableName}`;
  const row = db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
    [prefixed]
  );
  return (row?.count ?? 0) > 0;
},
```

Note: `createTable` in PluginAPI should also namespace the table as `plugin_{pluginId}_{tableName}`. Verify this is consistent with how paymob queries `plugin_paymob_transactions`.

### 2.4 Audit `checkIdempotency` / `storeIdempotency`

**File**: `plugins/paymob/src/api/routes.ts:99,125` calls `api.checkIdempotency()` and `api.storeIdempotency()`.

Check if these methods exist in `packages/plugin-sdk/src/types.ts` and are implemented in `src/lib/PluginAPI.ts`. If missing:

Add to SDK types:
```typescript
checkIdempotency(key: string): Promise<Record<string, unknown> | null>;
storeIdempotency(key: string, data: Record<string, unknown>, ttlSeconds?: number): Promise<void>;
```

Add implementation (uses in-memory or DB-backed store):
```typescript
// Use a plugin-scoped idempotency table or in-memory Map with TTL
async checkIdempotency(key: string): Promise<Record<string, unknown> | null> {
  try {
    const row = await db.queryOne<{ response_body: string; created_at: number }>(
      `SELECT response_body, created_at FROM plugin_idempotency_keys WHERE plugin_id = ? AND idempotency_key = ? AND expires_at > unixepoch()`,
      [pluginId, key]
    );
    return row ? JSON.parse(row.response_body) : null;
  } catch {
    return null;
  }
},
async storeIdempotency(key: string, data: Record<string, unknown>, ttlSeconds = 86400): Promise<void> {
  try {
    await db.execute(
      `INSERT OR REPLACE INTO plugin_idempotency_keys (plugin_id, idempotency_key, response_body, expires_at)
       VALUES (?, ?, ?, unixepoch() + ?)`,
      [pluginId, key, JSON.stringify(data), ttlSeconds]
    );
  } catch {}
},
```

Check if `plugin_idempotency_keys` table exists in migrations. If not, add it to `src/db/migrations/` as a new SQL file.

### 2.5 Audit All Plugin `init()` Functions for Hook Correctness

Run the existing init tests to find any broken plugins:
```bash
npx vitest run src/lib/__tests__/plugin-inits.test.ts 2>&1
```

For each failing plugin, identify whether:
- It uses a non-existent API method
- It uses wrong hook names
- It calls `db.createTable` with a table that's already namespaced differently
- It assumes fields in `api.config` that aren't documented

Fix root causes, not symptoms.

### 2.6 Hook System Audit

**File**: `src/lib/hooks.ts`

Read the full file. Check that:
- `doAction` (fire-and-forget) vs `applyFilters` (transform-and-return) are used correctly in all callers
- Hook handlers that throw errors do not crash the calling plugin
- The `PluginEngine` import at line 1 is available and not a stub

Run hook tests:
```bash
npx vitest run src/lib/__tests__/hooks.test.ts 2>&1
npx vitest run src/lib/__tests__/hooks-phase3.test.ts 2>&1
```

Fix any failures.

### 2.7 PluginBroker Audit

**File**: `src/lib/PluginBroker.ts`

Verify that `PluginBroker.register()` and `PluginBroker.call()` work correctly when:
- A plugin is not loaded yet (should return gracefully, not throw)
- A plugin returns undefined from its public API
- Two plugins try to register under the same ID

```bash
npx vitest run src/lib/__tests__/PluginBroker.test.ts 2>&1
```

### 2.8 PluginWatchdog Audit

**File**: `src/lib/plugin-watchdog.ts`

Verify `recordLoad`, `recordError`, `removeRecord`, `startWatchdog` are all called correctly from `PluginRuntimeService`. Confirm that a plugin that errors during init is properly recorded and does NOT prevent other plugins from loading.

---

## Part 3 — Paymob Plugin: Documentation-Accurate Rewrite

This is the highest-priority section. The current implementation has several issues that need fixing per the actual Paymob API docs.

### 3.1 HMAC Verification Fix (CRITICAL SECURITY BUG)

**Current broken code** (`plugins/paymob/src/services/PaymobService.ts:102-104`):
```typescript
verifyHmac(transaction: PaymobTransaction, hmacHeader: string): boolean {
  if (!this.config.hmacSecret) return true;
  return hmacHeader === transaction.hmac;  // ❌ WRONG — compares header to a tx field
}
```

**Per Paymob docs**, HMAC verification requires:
1. Concatenate specific transaction fields in a specific order
2. Hash the concatenated string using HMAC-SHA512 with your HMAC secret
3. Compare the result (hex digest) to the `hmac` query parameter in the webhook URL

The required fields (in order) per Paymob docs are:
```
amount_cents, created_at, currency, error_occured, has_parent_transaction, 
id (transaction id), integration_id, is_3d_secure, is_auth, is_capture, 
is_refund, is_standalone_payment, is_void, order.id, owner, pending, 
source_data.pan, source_data.sub_type, source_data.type, success
```

**Fix `PaymobService.verifyHmac`**:
```typescript
import { createHmac } from 'crypto';

verifyHmac(transaction: PaymobTransaction, receivedHmac: string): boolean {
  if (!this.config.hmacSecret) {
    // In production, always require HMAC
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  
  // Concatenate fields in exact order per Paymob docs
  const fields = [
    String(transaction.amount_cents),
    transaction.created_at,
    transaction.currency,
    String(transaction.error_occured),
    String(transaction.has_parent_transaction ?? false),
    String(transaction.id),
    String(transaction.integration_id),
    String(transaction.is_3d_secure),
    String(transaction.is_auth),
    String(transaction.is_capture),
    String(transaction.is_refund),
    String(transaction.is_standalone_payment),
    String(transaction.is_void),
    String(transaction.order?.id ?? ''),
    String(transaction.owner ?? ''),
    String(transaction.pending),
    transaction.source_data?.pan ?? 'N/A',
    transaction.source_data?.sub_type ?? 'N/A',
    transaction.source_data?.type ?? 'N/A',
    String(transaction.success),
  ];
  
  const concatenated = fields.join('');
  const expected = createHmac('sha512', this.config.hmacSecret)
    .update(concatenated)
    .digest('hex');
  
  // Timing-safe comparison
  if (expected.length !== receivedHmac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ receivedHmac.charCodeAt(i);
  }
  return diff === 0;
}
```

**Update `PaymobTransaction` type** in `plugins/paymob/src/types.ts` to include all fields used in HMAC:
```typescript
export interface PaymobTransaction {
  id: number;
  order: { id: number };
  success: boolean;
  pending: boolean;
  amount_cents: number;
  currency: string;
  created_at: string;
  source_data: { type: string; sub_type: string; pan: string };
  payment_method: string;
  hmac?: string;                           // deprecated field — now in URL params
  is_void: boolean;
  is_refund: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_3d_secure: boolean;
  error_occured: boolean;
  has_parent_transaction?: boolean;
  integration_id?: number;
  owner?: number;
  data: Record<string, string>;
}
```

### 3.2 Webhook Route Fix — HMAC from URL Params

Per Paymob docs, the HMAC value is **NOT in a header** — it is sent as a **query parameter** in the webhook URL: `POST /webhook?hmac=xxx`.

**Fix `plugins/paymob/src/api/routes.ts`** webhook handler:

```typescript
api.registerRoute('/api/p/paymob/webhook', {
  POST: async (req: Request) => {
    try {
      const url = new URL(req.url);
      // HMAC is a URL query param, not a header
      const hmacParam = url.searchParams.get('hmac') || '';
      
      const rawBody = await req.text();
      let parsed: PaymobWebhookPayload;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      // Verify using URL HMAC param (not header)
      if (!paymob.verifyHmac(parsed.obj, hmacParam)) {
        api.logger.warn('[paymob] Webhook HMAC verification failed');
        return json({ error: 'Invalid HMAC signature' }, 401);
      }
      
      // ... rest of handler
```

### 3.3 Add Transaction Inquiry / Verify Payment on Return

Per Paymob docs, the `/return` URL receives query params but **should NOT trust them blindly**. The payment must be verified via Transaction Inquiry API.

**Add to `PaymobService`**:
```typescript
/** Verify a transaction by ID via Paymob's Transaction Inquiry API. */
async getTransaction(token: string, transactionId: string): Promise<PaymobTransaction> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${transactionId}`, {
    headers: createAuthHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paymob transaction inquiry failed (${res.status}): ${body}`);
  }
  return res.json();
}
```

**Update `/api/p/paymob/return` handler** to verify via inquiry:
```typescript
api.registerRoute('/api/p/paymob/return', {
  GET: async (req: Request) => {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get('id') || '';
    const success = url.searchParams.get('success') === 'true';
    const orderId = url.searchParams.get('order') || '';
    const hmacParam = url.searchParams.get('hmac') || '';

    if (!transactionId) {
      return json({ success: false, message: 'Missing transaction ID' }, 400);
    }

    try {
      // Re-verify via API — never trust redirect params alone
      const config = getConfig(api);
      const svc = new PaymobService(config);
      const token = await svc.getAuthToken();
      const txn = await svc.getTransaction(token, transactionId);

      const status = svc.resolveStatus(txn);

      // Update our local DB record
      await api.db.execute(
        `UPDATE plugin_paymob_transactions SET status = ?, transaction_id = ?, updated_at = ? 
         WHERE order_id = ?`,
        [status, transactionId, new Date().toISOString(), orderId]
      );

      if (status === 'completed') {
        api.logger.info(`[paymob] Return verified: txn ${transactionId} completed`);
        return json({ success: true, message: 'Payment completed', orderId, transactionId });
      }

      return json({ success: false, message: `Payment status: ${status}`, orderId, transactionId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      api.logger.error(`[paymob] Return verification failed: ${msg}`);
      // Fallback to URL param (unverified) — never mark as completed without API confirmation
      return json({ success: false, message: 'Could not verify payment', orderId }, 500);
    }
  },
});
```

### 3.4 Add Refund Route

Per Paymob docs, refunds are issued by POSTing to `/acceptance/void_refund/refund`:

**Add to `PaymobService`**:
```typescript
/** Issue a refund for a transaction. */
async refundTransaction(
  token: string,
  transactionId: number,
  amountCents: number
): Promise<{ id: number; pending: boolean; success: boolean }> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/void_refund/refund`, {
    method: 'POST',
    headers: createAuthHeaders(token),
    body: JSON.stringify({
      auth_token: token,
      transaction_id: transactionId,
      amount_cents: amountCents,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paymob refund failed (${res.status}): ${body}`);
  }
  return res.json();
}
```

**Add refund route** in `registerRoutes`:
```typescript
api.registerRoute('/api/p/paymob/refund', {
  POST: async (req: Request) => {
    try {
      const session = await api.auth.getSession(req);
      if (!session?.user) return json({ error: 'Unauthorized' }, 401);
      // Only managers/owners can refund
      if (!['manager', 'owner', 'admin'].includes(session.user.role || '')) {
        return json({ error: 'Forbidden' }, 403);
      }

      const body = await req.json();
      const { transactionId, amountCents } = body;
      if (!transactionId || !amountCents) {
        return json({ error: 'transactionId and amountCents are required' }, 400);
      }

      const config = getConfig(api);
      const svc = new PaymobService(config);
      const token = await svc.getAuthToken();
      const result = await svc.refundTransaction(token, parseInt(transactionId), amountCents);

      await api.db.execute(
        `UPDATE plugin_paymob_transactions SET status = 'refunded', updated_at = ? WHERE transaction_id = ?`,
        [new Date().toISOString(), String(transactionId)]
      );

      api.logger.info(`[paymob] Refund issued for transaction ${transactionId}`);
      return json({ success: true, refundId: result.id, pending: result.pending }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      api.logger.error(`[paymob] refund failed: ${msg}`);
      return json({ error: 'Refund failed', details: msg }, 500);
    }
  },
});
```

### 3.5 Fix Incomplete `processWebhook` Method

**File**: `plugins/paymob/src/services/PaymobService.ts:116-121`

The method has an empty body after declaring variables. Either implement it properly or remove it since the routes.ts handler already does this work inline:

```typescript
/** Full webhook processing — updates local DB and returns normalized status. */
async processWebhook(transaction: PaymobTransaction): Promise<string> {
  return this.resolveStatus(transaction);
}
```

### 3.6 Auth in Create-Payment Route

The current `POST /api/p/paymob/create-payment` has no authentication. Any unauthenticated caller can initiate a payment. Add session check:

```typescript
POST: async (req: Request) => {
  const session = await api.auth.getSession(req);
  if (!session?.user) return json({ error: 'Unauthorized — must be logged in to create payment' }, 401);
  
  // ... existing code
```

### 3.7 Add `api.auth.getSession` to PluginAPI

If `api.auth.getSession` is not yet on the `PluginAPI` interface, add it:

**`packages/plugin-sdk/src/types.ts`** — add to `PluginAPI`:
```typescript
auth: {
  getSession(req: Request): Promise<{ user: { id: string; email: string; role: string } } | null>;
};
```

**`src/lib/PluginAPI.ts`** — add to `makePluginAPI` return:
```typescript
auth: {
  async getSession(req: Request) {
    return getAuthSession(req);
  },
},
```

### 3.8 Update `plugin.json` Hooks Declaration

**File**: `plugins/paymob/plugin.json`

Add hooks the plugin registers:
```json
{
  "id": "paymob",
  "name": "Paymob Payments",
  "version": "1.1.0",
  "description": "Paymob payment gateway integration for accepting payments via credit card, mobile wallet, and installments.",
  "author": "SinaiCamps Core",
  "apiVersion": "^2.0.0",
  "campopsVersion": "^1.0.0",
  "entry": "src/index.ts",
  "planRequirement": "basic",
  "reviewStatus": "approved",
  "hooks": {
    "filters": ["payment:collect_methods"],
    "actions": ["payment:success"]
  }
}
```

---

## Part 4 — Write Tests for Paymob

### 4.1 Unit Tests for PaymobService

**File**: `plugins/paymob/__tests__/PaymobService.test.ts`

Write tests covering:
```typescript
describe('PaymobService', () => {
  it('getAuthToken — makes POST to /auth/tokens', async () => { ... });
  it('registerOrder — posts merchant_order_id, amount_cents, currency', async () => { ... });
  it('getPaymentKey — sends integration_id as integer', async () => { ... });
  it('getIframeUrl — builds correct URL with token', async () => { ... });
  it('createPaymentIntent — orchestrates auth → order → key → iframeUrl', async () => { ... });

  // HMAC verification — most important
  describe('verifyHmac', () => {
    it('returns false with wrong secret', () => { ... });
    it('returns true with correct HMAC-SHA512', () => { ... });
    it('returns true when no secret configured (non-production)', () => { ... });
    it('returns false when no secret configured in production', () => { ... });
    it('is timing-safe (constant time comparison)', () => { ... });
  });

  describe('resolveStatus', () => {
    it('returns completed when success=true', () => { ... });
    it('returns refunded when is_void=true', () => { ... });
    it('returns failed when error_occured=true', () => { ... });
    it('returns pending when pending=true', () => { ... });
  });
});
```

### 4.2 Route Handler Tests

**File**: `plugins/paymob/__tests__/routes.test.ts`

Test each route:
- `POST /api/p/paymob/create-payment` — 400 on missing fields, 401 without session, 201 on success (mock PaymobService)
- `POST /api/p/paymob/webhook` — 401 on bad HMAC, 200 on valid, idempotent on duplicate
- `GET /api/p/paymob/return` — verifies via inquiry, returns correct success/failure
- `POST /api/p/paymob/refund` — 403 for guest, 201 for manager, updates DB

Use `vi.mock` to stub `PaymobService` methods — never make real HTTP calls in tests.

---

## Part 5 — Fix All Other Plugin Issues Found During Audit

After the above fixes, run the full plugin test suite:
```bash
npx vitest run src/lib/__tests__/plugin-loader.test.ts 2>&1
npx vitest run src/lib/__tests__/plugin-ecosystem.test.ts 2>&1  
npx vitest run src/lib/__tests__/plugin-inits.test.ts 2>&1
npx vitest run src/lib/__tests__/plugin-health.test.ts 2>&1
npx vitest run plugins/ --reporter=verbose 2>&1
```

For each failing test, identify and fix the root cause. Document every finding in AGENT_LOGBOOK.md.

---

## Part 6 — Final Verification

```bash
# Full test suite — must be 1165+ pass, 0 fail
npm test

# Type check — must be 0 errors
npm run type-check 2>&1 | grep -E "error TS" | head -20

# Lint — must be 0 errors
npm run lint 2>&1 | grep -E "error" | head -20

# Paymob plugin specifically
npx vitest run plugins/paymob 2>&1

# Plugin ecosystem
npx vitest run src/lib/__tests__/plugin-ecosystem.test.ts src/lib/__tests__/plugin-loader.test.ts 2>&1
```

---

## Part 7 — Update AGENT_LOGBOOK.md

Append a dated entry to AGENT_LOGBOOK.md covering:
- All files changed
- Root causes of each bug fixed
- Paymob API version used (v1 Legacy or v2 Accept API)
- Any Paymob API behaviours learned from docs that differ from assumptions
- New test count
- Any gotchas for future agents working on plugins or Paymob

---

## Critical Rules

1. **Never `return true` on HMAC verification when in production without actually verifying** — this is a payment security vulnerability.
2. **Never trust Paymob redirect URL parameters alone** — always verify via Transaction Inquiry API.
3. **All plugin routes that mutate data MUST check session** via `api.auth.getSession(req)`.
4. **Hook names must exactly match constants in `src/lib/hooks.ts`** — dot notation ≠ colon notation.
5. **`db.createTable` namespaces tables as `plugin_{pluginId}_{tableName}`** — queries must use the same prefix.
6. **Do not change core schema tables** (`users`, `sessions`, `properties`, `sites`, etc.).
7. **Run `npm test` after each part** — never leave a part with failing tests.
