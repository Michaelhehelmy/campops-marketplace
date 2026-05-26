# OpenCode Agent Prompt: Parallel Tracks — Paymob Rewrite + Booking Plugin Fix

## Baseline

**131 test files, 1177 tests passing, 0 failures.**  
Both tracks must be committed separately. Verify baseline before starting either track.

```bash
npm test 2>&1 | tail -5
```

---

# ═══════════════════════════════════════════════
# TRACK A — Paymob Plugin Rewrite
# Assign to: Agent 1
# ═══════════════════════════════════════════════

## A.0 — Read Paymob Docs Before Any Code Changes

You MUST fetch and confirm the following before writing `verifyHmac`:

| What | URL |
|------|-----|
| HMAC calculation | https://docs.paymob.com/docs/hmac-calculation |
| Transaction processed callback | https://docs.paymob.com/docs/transaction-processed-callback |
| Transaction inquiry | https://docs.paymob.com/docs/transaction-inquiry |
| Refund API | https://docs.paymob.com/docs/refund-a-transaction |

Confirm from docs:
1. The exact **ordered list of 20 fields** for HMAC-SHA512 concatenation
2. Whether HMAC arrives as URL `?hmac=` query param OR HTTP header
3. The exact endpoint path for transaction inquiry
4. The exact request body shape for refunds

---

## A.1 — Fix `plugins/paymob/src/services/PaymobService.ts`

Read the current file fully first (`plugins/paymob/src/services/PaymobService.ts`).

### Issue 1 — `verifyHmac` is completely broken (line 102-105)

**Current (broken)**:
```typescript
verifyHmac(transaction: PaymobTransaction, hmacHeader: string): boolean {
  if (!this.config.hmacSecret) return true;
  return hmacHeader === transaction.hmac;  // transaction.hmac doesn't exist!
}
```

**Fix** — real HMAC-SHA512 with timing-safe comparison:
```typescript
verifyHmac(transaction: PaymobTransaction, receivedHmac: string): boolean {
  if (!this.config.hmacSecret) {
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  if (!receivedHmac) return false;

  // Field order per https://docs.paymob.com/docs/hmac-calculation
  // CONFIRM this list against the docs before committing:
  const concatenated = [
    String(transaction.amount_cents),
    transaction.created_at,
    transaction.currency,
    String(transaction.error_occured),
    String(transaction.has_parent_transaction),
    String(transaction.id),
    String(transaction.integration_id),
    String(transaction.is_3d_secure),
    String(transaction.is_auth),
    String(transaction.is_capture),
    String(transaction.is_refund),
    String(transaction.is_standalone_payment),
    String(transaction.is_void),
    String(transaction.order?.id ?? ''),
    String(transaction.owner),
    String(transaction.pending),
    transaction.source_data?.pan ?? 'N/A',
    transaction.source_data?.sub_type ?? 'N/A',
    transaction.source_data?.type ?? 'N/A',
    String(transaction.success),
  ].join('');

  const { createHmac } = await import('crypto');
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

**Note**: `createHmac` needs to be imported at the top of the file from `'crypto'`, not dynamically inside the method. Use `import { createHmac } from 'crypto';` at the top of the file.

### Issue 2 — `processWebhook` is an empty method (line 117-121)

This method is unused by `routes.ts` (the route does its own DB update directly). Either:
- Remove it entirely, OR
- Implement it properly and call it from the webhook route

The cleaner fix: remove `processWebhook` and keep the inline logic in the route.

### Issue 3 — Missing `getTransaction` method

Add after `getIframeUrl`:
```typescript
async getTransaction(token: string, transactionId: string): Promise<PaymobTransaction> {
  // Verify exact path from https://docs.paymob.com/docs/transaction-inquiry
  const res = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${transactionId}`, {
    headers: createAuthHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paymob inquiry failed (${res.status}): ${body}`);
  }
  return res.json();
}
```

### Issue 4 — Missing `refundTransaction` method

Add after `getTransaction`:
```typescript
async refundTransaction(
  token: string,
  transactionId: number,
  amountCents: number
): Promise<{ id: number; pending: boolean; success: boolean }> {
  // Verify exact path and body from https://docs.paymob.com/docs/refund-a-transaction
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

---

## A.2 — Fix `plugins/paymob/src/types.ts`

Read the current file. Verify it has ALL these fields on `PaymobTransaction` — they are required for correct HMAC concatenation:
- `has_parent_transaction: boolean`
- `integration_id: number`
- `owner: number`
- `source_data.sub_type: string` (in `PaymobSourceData`)
- `error_occured: boolean` (note: Paymob's spelling, not "error_occurred")

If any are missing, add them. Do NOT remove or rename existing fields.

Also ensure `PaymobConfig` includes `integrationId: string`.

The `hmac` field does NOT exist on `PaymobTransaction` — if the current types.ts has it, remove it.

---

## A.3 — Rewrite `plugins/paymob/src/api/routes.ts`

Read the full current file. There are **4 bugs** to fix:

### Bug 1 — `create-payment` has no authentication (line 30-77)

Add session check at the top of the POST handler:
```typescript
const session = await api.auth.getSession(req);
if (!session?.user) {
  return json({ error: 'Authentication required' }, 401);
}
```

### Bug 2 — `webhook` reads HMAC from HTTP header (line 90)

**Current (wrong)**:
```typescript
const hmacHeader = req.headers.get('hmac') || req.headers.get('x-hmac') || '';
```

**Fix** — Paymob sends HMAC as URL query param:
```typescript
const url = new URL(req.url);
const hmacParam = url.searchParams.get('hmac') || '';
```

Then pass `hmacParam` to `verifyHmac` instead of `hmacHeader`.

Also fix idempotency response: current code only stores idempotency for `completed`/`failed` but returns early without storing for `pending`. Fix: always store idempotency after processing:
```typescript
const responsePayload = { processed: true, status, paymentRef, transactionId: transaction.id };
await api.storeIdempotency(idempotencyKey, responsePayload);
return json(responsePayload);
```

### Bug 3 — `return` route trusts `?success=true` without verification (line 141-155)

**Current (insecure)** — just reads `?success=true` query param and returns success.

**Fix** — call Transaction Inquiry API:
```typescript
api.registerRoute('/api/p/paymob/return', {
  GET: async (req: Request) => {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get('id') || '';
    const orderId = url.searchParams.get('order') || '';

    if (!transactionId) {
      return json({ success: false, message: 'Missing transaction ID' }, 400);
    }

    try {
      const token = await paymob.getAuthToken();
      const txn = await paymob.getTransaction(token, transactionId);
      const status = paymob.resolveStatus(txn);

      await api.db.execute(
        `UPDATE plugin_paymob_transactions
         SET status = ?, transaction_id = ?, updated_at = ?
         WHERE order_id = ?`,
        [status, transactionId, new Date().toISOString(), orderId]
      );

      if (status === 'completed') {
        return json({ success: true, message: 'Payment completed', orderId, transactionId });
      }
      return json({ success: false, message: `Payment ${status}`, orderId, transactionId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      api.logger.error(`[paymob] Return verify failed: ${msg}`);
      return json({ success: false, message: 'Could not verify payment', orderId }, 500);
    }
  },
});
```

### Bug 4 — `/refund` route is missing entirely

Add after the `return` route:
```typescript
const ALLOWED_REFUND_ROLES = new Set(['manager', 'owner', 'admin']);

api.registerRoute('/api/p/paymob/refund', {
  POST: async (req: Request) => {
    try {
      const session = await api.auth.getSession(req);
      if (!session?.user) return json({ error: 'Authentication required' }, 401);
      if (!ALLOWED_REFUND_ROLES.has((session.user as any).role || '')) {
        return json({ error: 'Forbidden — manager or owner role required' }, 403);
      }

      const body = await req.json();
      const { transactionId, amountCents } = body;
      if (!transactionId || !amountCents) {
        return json({ error: 'transactionId and amountCents are required' }, 400);
      }

      const token = await paymob.getAuthToken();
      const result = await paymob.refundTransaction(token, parseInt(transactionId), amountCents);

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

**Note**: `paymob` is instantiated at the top of `registerRoutes`. The new `getTransaction` and `refundTransaction` calls use the same instance.

---

## A.4 — Fix `plugins/paymob/plugin.json`

Replace entirely:
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

## A.5 — Fix `plugins/paymob/package.json`

Add `"auth"` to capabilities (required for `api.auth.getSession` to work):
```json
{
  "name": "@sinaicamps/plugin-paymob",
  "version": "1.1.0",
  "description": "Paymob Payments",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "sinaicamps": {
    "pluginId": "paymob",
    "sinaicampsVersion": ">=2.0.0",
    "capabilities": ["auth", "payment", "network", "database", "routes", "hooks"]
  },
  "devDependencies": {
    "@sinaicamps/plugin-sdk": "*"
  }
}
```

---

## A.6 — Update `plugins/paymob/__tests__/index.test.ts`

### Fix 1 — Update the 3-route test (line 54-61)

Change `'registers three API routes'` to expect 4:
```typescript
it('registers four API routes including refund', async () => {
  await init(api);
  const routeCalls = (api.registerRoute as ReturnType<typeof vi.fn>).mock.calls;
  const paths = routeCalls.map((c: any[]) => c[0]);
  expect(paths).toContain('/api/p/paymob/create-payment');
  expect(paths).toContain('/api/p/paymob/webhook');
  expect(paths).toContain('/api/p/paymob/return');
  expect(paths).toContain('/api/p/paymob/refund');
  expect(paths).toHaveLength(4);
});
```

### Fix 2 — Add HMAC unit tests

Add a new `describe` block at the bottom of the file. First add the import at top:
```typescript
import { PaymobService } from '../src/services/PaymobService.js';
import type { PaymobTransaction } from '../src/types.js';
import { createHmac } from 'crypto';
```

Then add:
```typescript
describe('PaymobService.verifyHmac', () => {
  function buildTxn(): PaymobTransaction {
    return {
      id: 12345, order: { id: 999 }, success: true, pending: false,
      amount_cents: 10000, currency: 'EGP', created_at: '2024-01-01T00:00:00Z',
      source_data: { type: 'card', sub_type: 'Visa', pan: '1234' },
      payment_method: 'card', is_void: false, is_refund: false, is_auth: false,
      is_capture: false, is_standalone_payment: true, is_3d_secure: false,
      error_occured: false, has_parent_transaction: false,
      integration_id: 67890, owner: 100, data: {},
    };
  }

  it('returns false when no hmacSecret in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: '', integrationId: '' });
    expect(svc.verifyHmac(buildTxn(), 'any')).toBe(false);
  });

  it('returns true without secret in non-production (test bypass)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: '', integrationId: '' });
    expect(svc.verifyHmac(buildTxn(), '')).toBe(true);
  });

  it('returns false for wrong HMAC', () => {
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: 'secret', integrationId: '' });
    expect(svc.verifyHmac(buildTxn(), 'deadbeef')).toBe(false);
  });

  it('returns false when HMAC is empty string with a secret set', () => {
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: 'secret', integrationId: '' });
    expect(svc.verifyHmac(buildTxn(), '')).toBe(false);
  });

  it('returns true for correct HMAC-SHA512', () => {
    const secret = 'test-secret-key';
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: secret, integrationId: '' });
    const txn = buildTxn();
    // Build the same concatenation as verifyHmac (must match field order exactly)
    const concatenated = [
      String(txn.amount_cents),
      txn.created_at,
      txn.currency,
      String(txn.error_occured),
      String(txn.has_parent_transaction),
      String(txn.id),
      String(txn.integration_id),
      String(txn.is_3d_secure),
      String(txn.is_auth),
      String(txn.is_capture),
      String(txn.is_refund),
      String(txn.is_standalone_payment),
      String(txn.is_void),
      String(txn.order?.id ?? ''),
      String(txn.owner),
      String(txn.pending),
      txn.source_data?.pan ?? 'N/A',
      txn.source_data?.sub_type ?? 'N/A',
      txn.source_data?.type ?? 'N/A',
      String(txn.success),
    ].join('');
    const expected = createHmac('sha512', secret).update(concatenated).digest('hex');
    expect(svc.verifyHmac(txn, expected)).toBe(true);
  });
});
```

**Critical**: the field order in the test's `concatenated` array must exactly match the order in `verifyHmac`. If you change the order in `verifyHmac` after reading the Paymob docs, update this test too.

---

## A.7 — Verify Track A

```bash
# Run paymob tests
npx vitest run plugins/paymob --reporter=verbose 2>&1

# Full suite
npm test 2>&1 | tail -5
# Expected: 1177+ pass, 0 fail

# TypeScript
npx tsc --noEmit 2>&1 | grep "plugins/paymob"
# Expected: no output (0 errors)
```

---

# ═══════════════════════════════════════════════
# TRACK B — Booking Plugin `.js` Extension Fix
# Assign to: Agent 2 (can run in parallel with Track A)
# ═══════════════════════════════════════════════

## B.0 — Context

`@sinaicamps/plugin-sdk` uses `"moduleResolution": "node16"` in its `tsconfig.json`. Under `node16`, TypeScript requires explicit `.js` extensions on all relative imports — even when the source file is `.ts`.

**Symptom**: IDE shows LSP errors on imports without `.js` in booking plugin files.  
**Impact**: Currently test-only (tests pass), but will cause runtime errors if the plugin is ever compiled to ESM. Fix before the first booking plugin deploy.

## B.1 — Find All Missing Extensions in Booking Plugin

```bash
# Find all relative imports in booking plugin without .js extension
grep -rn "from '\.\." plugins/booking/src/ | grep -v "\.js'" | grep -v "\.json'"
grep -rn "from '\.\." plugins/booking/src/ | grep -v "\.js'" | grep -v "\.json'"
```

Expected findings based on code inspection:
- `plugins/booking/src/services/RoomService.ts:1` — `from '../schemas'` → missing `.js`

Check all files:
```bash
find plugins/booking/src -name "*.ts" | xargs grep -n "from '\.\./"
```

## B.2 — Fix Each Missing `.js` Extension

For every relative import missing `.js`, add it. The pattern is always:
```typescript
// Before
import type { Foo } from '../schemas';
import { Bar } from './services/BarService';

// After
import type { Foo } from '../schemas.js';
import { Bar } from './services/BarService.js';
```

**Files confirmed to need fixing:**

`plugins/booking/src/services/RoomService.ts:1`:
```typescript
// Change:
import type { CheckAvailabilityInput } from '../schemas';
// To:
import type { CheckAvailabilityInput } from '../schemas.js';
```

**After each fix**, run:
```bash
npx tsc --noEmit 2>&1 | grep "plugins/booking"
```

Repeat until no booking plugin errors remain.

## B.3 — Also Check These Booking Plugin Files

Read and verify `.js` extensions are present in all imports:
- `plugins/booking/src/index.ts`
- `plugins/booking/src/hooks.ts`
- `plugins/booking/src/db/index.ts`
- `plugins/booking/src/db/schema.ts`

Look for any `from '../xxx'` or `from './xxx'` without `.js`.

## B.4 — Verify Track B

```bash
# Booking tests still pass
npx vitest run plugins/booking --reporter=verbose 2>&1

# Full suite — no regressions
npm test 2>&1 | tail -5
# Expected: 1177+ pass, 0 fail

# No booking plugin TS errors
npx tsc --noEmit 2>&1 | grep "plugins/booking"
# Expected: no output
```

---

# ═══════════════════════════════════════════════
# SHARED — After Both Tracks Complete
# ═══════════════════════════════════════════════

## Final Verification

```bash
npm test 2>&1 | tail -5
# Must be: 1177+ pass, 0 fail

npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scripts/" | head -20
# Expected: no plugin-related errors
```

## Commit Strategy

```bash
# Track A
git add plugins/paymob/
git commit -m "feat(paymob): rewrite — HMAC-SHA512, auth guards, refund route, transaction inquiry"

# Track B
git add plugins/booking/src/services/RoomService.ts
git add plugins/booking/src/  # any other files changed
git commit -m "fix(booking): add .js extensions for node16 moduleResolution"
```

## Update AGENT_LOGBOOK.md

One entry covering both tracks:
- Paymob: list all 4 bugs fixed in routes.ts, list the HMAC field order confirmed from docs, new test count
- Booking: list every file changed and which imports were fixed
- Note any discrepancies between the HMAC field order in this prompt and what the docs actually show
