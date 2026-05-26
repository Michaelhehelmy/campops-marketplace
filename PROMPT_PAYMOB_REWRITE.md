# OpenCode Agent Prompt: Paymob Plugin Rewrite

## Context & Current State

**Baseline**: 1165/1165 tests pass, 130/130 files green. Do not regress this.

**Plugin path**: `plugins/paymob/`

**Files to rewrite**:
- `plugins/paymob/src/index.ts`
- `plugins/paymob/src/services/PaymobService.ts`
- `plugins/paymob/src/api/routes.ts`
- `plugins/paymob/src/types.ts`
- `plugins/paymob/plugin.json`
- `plugins/paymob/package.json` (add `'auth'` capability)
- `plugins/paymob/__tests__/index.test.ts` (update for new refund route)

**Do NOT create**: new PluginAPI methods, new SDK types, new migrations.  
All of these **already exist and work**:
- `api.db.tableExists(name)` — `src/lib/PluginAPI.ts:175`
- `api.checkIdempotency(key)` / `api.storeIdempotency(key, data)` — `src/lib/PluginAPI.ts:209,219`
- `api.auth.getSession(req)` — `src/lib/PluginAPI.ts:325` (requires `'auth'` capability in package.json)

---

## Step 0 — Read Paymob Documentation First

**You MUST fetch and read these URLs before writing any code.**  
Do not guess at field names, field order, or endpoint paths — the docs are the authority.

| What | URL |
|------|-----|
| Standard integration overview | https://docs.paymob.com/docs/accept-standard-integration |
| Authentication token | https://docs.paymob.com/docs/authentication-request |
| Order registration | https://docs.paymob.com/docs/order-registration |
| Payment key request | https://docs.paymob.com/docs/payment-key-request |
| **HMAC calculation** | https://docs.paymob.com/docs/hmac-calculation |
| Transaction processed callback | https://docs.paymob.com/docs/transaction-processed-callback |
| Transaction inquiry | https://docs.paymob.com/docs/transaction-inquiry |
| Refund API | https://docs.paymob.com/docs/refund-a-transaction |
| Void API | https://docs.paymob.com/docs/void-a-transaction |

After reading, confirm:
1. The exact ordered list of fields for HMAC-SHA512 concatenation
2. Whether the HMAC is sent as a URL query param or HTTP header in the webhook
3. The endpoint path for transaction inquiry (`/acceptance/transactions/{id}` or different)
4. The exact request body shape for refunds

---

## Step 1 — Run Existing Tests (See Current Failures)

```bash
npx vitest run plugins/paymob --reporter=verbose 2>&1
```

Expected failures before your fix:
- `registers payment:collect_methods hook` — plugin currently uses dot notation `'payment.collect_methods'`
- `registers payment:success hook` — plugin currently uses `'payment.on_success'`

Keep the test file's assertions as the specification — your implementation must make them pass.

---

## Step 2 — `plugins/paymob/src/types.ts`

Rewrite with all fields required for correct HMAC verification.  
The key additions are fields used in HMAC concatenation that are currently missing:
`has_parent_transaction`, `integration_id`, `owner`.  
Also fix `source_data` to include `sub_type` (required in HMAC).

```typescript
export interface PaymobConfig {
  apiKey: string;
  iframeId: string;
  hmacSecret: string;
  integrationId: string;
}

export interface PaymobAuthResponse {
  token: string;
  profile: { id: number; merchant: { id: number } };
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  merchant_order_id?: string;
  amount_cents: number;
  currency: string;
}

export interface PaymobPaymentKeyResponse {
  token: string;
  id: number;
}

export interface PaymobSourceData {
  type: string;
  sub_type: string;
  pan: string;
}

export interface PaymobTransaction {
  id: number;
  order: { id: number };
  success: boolean;
  pending: boolean;
  amount_cents: number;
  currency: string;
  created_at: string;
  source_data: PaymobSourceData;
  payment_method: string;
  is_void: boolean;
  is_refund: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_3d_secure: boolean;
  error_occured: boolean;
  has_parent_transaction: boolean;
  integration_id: number;
  owner: number;
  data: Record<string, string>;
}

export interface CreatePaymentRequest {
  bookingId: string;
  amountCents: number;
  currency: string;
  billingData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    city?: string;
    country?: string;
    state?: string;
  };
}

export interface PaymobWebhookPayload {
  obj: PaymobTransaction;
  type: string;
}
```

---

## Step 3 — `plugins/paymob/src/services/PaymobService.ts`

Full rewrite. Key changes:
1. **`verifyHmac`** — HMAC-SHA512 over concatenated fields in exact doc-specified order, timing-safe comparison
2. **`getTransaction`** — new method for transaction inquiry (return URL verification)
3. **`refundTransaction`** — new method for issuing refunds
4. **`processWebhook`** — complete the stub (currently has empty body after variable declarations)

```typescript
import { createHmac } from 'crypto';
import type {
  PaymobConfig,
  PaymobAuthResponse,
  PaymobOrderResponse,
  PaymobPaymentKeyResponse,
  PaymobTransaction,
} from '../types.js';

const PAYMOB_BASE = 'https://accept.paymob.com/api';

function headers(token?: string): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

export class PaymobService {
  private config: PaymobConfig;

  constructor(config: PaymobConfig) {
    this.config = config;
  }

  async getAuthToken(): Promise<string> {
    const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ api_key: this.config.apiKey }),
    });
    if (!res.ok) throw new Error(`Paymob auth failed (${res.status}): ${await res.text()}`);
    const data: PaymobAuthResponse = await res.json();
    return data.token;
  }

  async registerOrder(
    token: string,
    merchantOrderId: string,
    amountCents: number,
    currency: string
  ): Promise<PaymobOrderResponse> {
    const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency,
        merchant_order_id: merchantOrderId,
        items: [],
      }),
    });
    if (!res.ok) throw new Error(`Paymob order failed (${res.status}): ${await res.text()}`);
    return res.json();
  }

  async getPaymentKey(
    token: string,
    orderId: number,
    amountCents: number,
    currency: string,
    billingData: Record<string, string>
  ): Promise<PaymobPaymentKeyResponse> {
    const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billingData,
        currency,
        integration_id: parseInt(this.config.integrationId, 10),
        lock_order_when_paid: false,
      }),
    });
    if (!res.ok) throw new Error(`Paymob payment key failed (${res.status}): ${await res.text()}`);
    return res.json();
  }

  getIframeUrl(paymentToken: string): string {
    return `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${paymentToken}`;
  }

  /**
   * Verify HMAC signature from Paymob webhook.
   * Concatenate fields in the exact order specified by Paymob docs, then
   * compare HMAC-SHA512 hex digest using timing-safe comparison.
   *
   * Field order (per https://docs.paymob.com/docs/hmac-calculation):
   * amount_cents, created_at, currency, error_occured, has_parent_transaction,
   * id, integration_id, is_3d_secure, is_auth, is_capture, is_refund,
   * is_standalone_payment, is_void, order.id, owner, pending,
   * source_data.pan, source_data.sub_type, source_data.type, success
   */
  verifyHmac(transaction: PaymobTransaction, receivedHmac: string): boolean {
    if (!this.config.hmacSecret) {
      if (process.env.NODE_ENV === 'production') return false;
      return true;
    }
    if (!receivedHmac) return false;

    // Verify exact field order against Paymob docs before committing this list
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

    const expected = createHmac('sha512', this.config.hmacSecret)
      .update(concatenated)
      .digest('hex');

    // Timing-safe comparison (prevent timing attacks)
    if (expected.length !== receivedHmac.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ receivedHmac.charCodeAt(i);
    }
    return diff === 0;
  }

  resolveStatus(txn: PaymobTransaction): string {
    if (txn.is_void || txn.is_refund) return 'refunded';
    if (txn.success) return 'completed';
    if (txn.pending) return 'pending';
    if (txn.error_occured) return 'failed';
    return 'unknown';
  }

  /**
   * Fetch a transaction by ID (Transaction Inquiry API).
   * Use this to verify the return URL — never trust redirect query params alone.
   */
  async getTransaction(token: string, transactionId: string): Promise<PaymobTransaction> {
    // Verify exact path from https://docs.paymob.com/docs/transaction-inquiry
    const res = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${transactionId}`, {
      headers: headers(token),
    });
    if (!res.ok) throw new Error(`Paymob inquiry failed (${res.status}): ${await res.text()}`);
    return res.json();
  }

  /**
   * Issue a refund for a transaction.
   * See https://docs.paymob.com/docs/refund-a-transaction
   */
  async refundTransaction(
    token: string,
    transactionId: number,
    amountCents: number
  ): Promise<{ id: number; pending: boolean; success: boolean }> {
    // Verify exact path and body shape from Paymob refund docs
    const res = await fetch(`${PAYMOB_BASE}/acceptance/void_refund/refund`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        auth_token: token,
        transaction_id: transactionId,
        amount_cents: amountCents,
      }),
    });
    if (!res.ok) throw new Error(`Paymob refund failed (${res.status}): ${await res.text()}`);
    return res.json();
  }

  async createPaymentIntent(
    merchantOrderId: string,
    amountCents: number,
    currency: string,
    billingData: Record<string, string>
  ): Promise<{ iframeUrl: string; paymentKey: string; orderId: number }> {
    const token = await this.getAuthToken();
    const order = await this.registerOrder(token, merchantOrderId, amountCents, currency);
    const pkRes = await this.getPaymentKey(token, order.id, amountCents, currency, billingData);
    return {
      iframeUrl: this.getIframeUrl(pkRes.token),
      paymentKey: pkRes.token,
      orderId: order.id,
    };
  }
}
```

**IMPORTANT**: After reading the Paymob HMAC docs, verify the field concatenation order in `verifyHmac` matches the documentation exactly. If any field is in the wrong position or missing, correct it. The comment above the field array lists the expected order — confirm it.

---

## Step 4 — `plugins/paymob/src/api/routes.ts`

Rewrite with 4 routes. Key changes vs current:
1. **`create-payment`**: add `api.auth.getSession` check (unauthenticated currently)
2. **`webhook`**: HMAC from URL query param `?hmac=` (NOT from headers)
3. **`return`**: verify via Transaction Inquiry API, not trusted from redirect params
4. **`refund`**: new route — manager/owner/admin only

```typescript
import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import type { PaymobTransaction, PaymobWebhookPayload } from '../types.js';
import { PaymobService } from '../services/PaymobService.js';

function getConfig(api: PluginAPI) {
  return {
    apiKey: process.env.PAYMOB_API_KEY || api.config.paymobApiKey || '',
    iframeId: process.env.PAYMOB_IFRAME_ID || api.config.paymobIframeId || '1',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET || api.config.paymobHmacSecret || '',
    integrationId: process.env.PAYMOB_INTEGRATION_ID || api.config.paymobIntegrationId || '1',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ALLOWED_REFUND_ROLES = new Set(['manager', 'owner', 'admin']);

export function registerRoutes(api: PluginAPI): void {
  // ── POST /api/p/paymob/create-payment ──────────────────────────────────────
  api.registerRoute('/api/p/paymob/create-payment', {
    POST: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session?.user) {
          return json({ error: 'Authentication required' }, 401);
        }

        const body = await req.json();
        const { bookingId, amountCents, currency = 'EGP', billingData } = body;

        if (!bookingId || !amountCents || !billingData?.email) {
          return json(
            { error: 'bookingId, amountCents, and billingData.email are required' },
            400
          );
        }

        const paymob = new PaymobService(getConfig(api));
        const result = await paymob.createPaymentIntent(
          bookingId,
          amountCents,
          currency,
          billingData
        );

        await api.db.execute(
          `INSERT INTO plugin_paymob_transactions
             (id, booking_id, order_id, amount_cents, currency, status, payment_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `pmt_${Date.now()}`,
            bookingId,
            result.orderId.toString(),
            amountCents,
            currency,
            'pending',
            result.paymentKey,
            new Date().toISOString(),
          ]
        );

        return json(
          {
            success: true,
            iframeUrl: result.iframeUrl,
            paymentKey: result.paymentKey,
            orderId: result.orderId,
          },
          201
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.error(`[paymob] create-payment failed: ${msg}`);
        return json({ error: 'Failed to create payment', details: msg }, 500);
      }
    },
  });

  // ── POST /api/p/paymob/webhook ─────────────────────────────────────────────
  // HMAC is sent as a URL query param: POST /webhook?hmac=<value>
  // See: https://docs.paymob.com/docs/transaction-processed-callback
  api.registerRoute('/api/p/paymob/webhook', {
    POST: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const hmacParam = url.searchParams.get('hmac') || '';

        const rawBody = await req.text();
        let parsed: PaymobWebhookPayload;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }

        const paymob = new PaymobService(getConfig(api));

        if (!paymob.verifyHmac(parsed.obj, hmacParam)) {
          api.logger.warn('[paymob] Webhook HMAC verification failed');
          return json({ error: 'Invalid HMAC signature' }, 401);
        }

        const transaction: PaymobTransaction = parsed.obj;
        const paymentRef = transaction.id.toString();
        const idempotencyKey = `paymob-webhook-${paymentRef}`;

        const existing = await api.checkIdempotency(idempotencyKey);
        if (existing) {
          return json({ processed: true, cached: true, status: existing.status });
        }

        const status = paymob.resolveStatus(transaction);

        await api.db.execute(
          `UPDATE plugin_paymob_transactions
           SET status = ?, transaction_id = ?, updated_at = ?
           WHERE order_id = ?`,
          [status, paymentRef, new Date().toISOString(), transaction.order?.id?.toString()]
        );

        const rows = await api.db.query(
          `SELECT booking_id FROM plugin_paymob_transactions WHERE order_id = ? LIMIT 1`,
          [transaction.order?.id?.toString()]
        );

        const responsePayload = {
          processed: true,
          status,
          paymentRef,
          transactionId: transaction.id,
          bookingId: rows?.[0]?.booking_id || null,
        };

        await api.storeIdempotency(idempotencyKey, responsePayload);
        return json(responsePayload);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.error(`[paymob] webhook error: ${msg}`);
        return json({ error: 'Webhook processing failed', details: msg }, 500);
      }
    },
  });

  // ── GET /api/p/paymob/return ───────────────────────────────────────────────
  // Paymob redirects here after payment. Verify via Transaction Inquiry — 
  // never trust redirect query params alone.
  api.registerRoute('/api/p/paymob/return', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const transactionId = url.searchParams.get('id') || '';
      const orderId = url.searchParams.get('order') || '';

      if (!transactionId) {
        return json({ success: false, message: 'Missing transaction ID' }, 400);
      }

      try {
        const paymob = new PaymobService(getConfig(api));
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
          api.logger.info(`[paymob] Return verified: txn ${transactionId} completed`);
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

  // ── POST /api/p/paymob/refund ──────────────────────────────────────────────
  api.registerRoute('/api/p/paymob/refund', {
    POST: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session?.user) return json({ error: 'Authentication required' }, 401);
        if (!ALLOWED_REFUND_ROLES.has(session.user.role || '')) {
          return json({ error: 'Forbidden — manager or owner role required' }, 403);
        }

        const body = await req.json();
        const { transactionId, amountCents } = body;
        if (!transactionId || !amountCents) {
          return json({ error: 'transactionId and amountCents are required' }, 400);
        }

        const paymob = new PaymobService(getConfig(api));
        const token = await paymob.getAuthToken();
        const result = await paymob.refundTransaction(token, parseInt(transactionId), amountCents);

        await api.db.execute(
          `UPDATE plugin_paymob_transactions
           SET status = 'refunded', updated_at = ?
           WHERE transaction_id = ?`,
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
}
```

---

## Step 5 — `plugins/paymob/src/index.ts`

Fix hook names from dot to colon notation. No other changes needed.

```typescript
import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerRoutes } from './api/routes.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[paymob] Initialising Paymob payment gateway...');

  const tableSql = `
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    order_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'EGP',
    status TEXT DEFAULT 'pending',
    payment_key TEXT,
    transaction_id TEXT,
    payment_method TEXT,
    card_last_four TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  `;

  const exists = await api.db.tableExists('transactions');
  if (!exists) {
    await api.db.createTable('transactions', tableSql);
    api.logger.info('[paymob] Created plugin_paymob_transactions table');
  }

  // Use colon notation — matches server src/lib/hooks.ts Hooks constants
  api.registerHook('payment:collect_methods', async (data: any) => {
    const methods = Array.isArray(data.methods) ? data.methods : [];
    return {
      ...data,
      methods: [...methods, { id: 'paymob', name: 'Paymob', type: 'iframe' }],
    };
  });

  api.registerHook('payment:success', async (data: any) => {
    if (data.gateway === 'paymob') {
      api.logger.info(`[paymob] Payment success for booking ${data.bookingId}`);
    }
    return data;
  });

  registerRoutes(api);

  await api.db.execute(
    'CREATE INDEX IF NOT EXISTS idx_paymob_tx_booking ON plugin_paymob_transactions(booking_id)'
  );
  await api.db.execute(
    'CREATE INDEX IF NOT EXISTS idx_paymob_tx_status ON plugin_paymob_transactions(status)'
  );

  api.logger.info('[paymob] Paymob payment gateway ready');
}
```

---

## Step 6 — `plugins/paymob/plugin.json`

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

## Step 7 — `plugins/paymob/package.json`

Add `'auth'` to capabilities (required by `api.auth.getSession`):

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
    "capabilities": [
      "auth",
      "payment",
      "network",
      "database",
      "routes",
      "hooks"
    ]
  },
  "devDependencies": {
    "@sinaicamps/plugin-sdk": "*"
  }
}
```

---

## Step 8 — Update `plugins/paymob/__tests__/index.test.ts`

The existing test at line 54-61 checks for exactly 3 routes. After adding `/refund`, update that assertion.  
Also add tests for the new refund route registration and auth guard.

Add after the existing 3-route assertion:
```typescript
it('registers four API routes including refund', async () => {
  await init(api);
  const routeCalls = (api.registerRoute as ReturnType<typeof vi.fn>).mock.calls;
  const paths = routeCalls.map((c: any[]) => c[0]);
  expect(paths).toContain('/api/p/paymob/create-payment');
  expect(paths).toContain('/api/p/paymob/webhook');
  expect(paths).toContain('/api/p/paymob/return');
  expect(paths).toContain('/api/p/paymob/refund');
});
```

Remove or update the old 3-route test to not conflict.

Also add HMAC unit tests in a new describe block:
```typescript
describe('PaymobService.verifyHmac', () => {
  it('returns false when no hmacSecret in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMOB_HMAC_SECRET', '');
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: '', integrationId: '' });
    expect(svc.verifyHmac({} as any, '')).toBe(false);
  });

  it('returns true without secret in non-production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('PAYMOB_HMAC_SECRET', '');
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: '', integrationId: '' });
    expect(svc.verifyHmac({} as any, '')).toBe(true);
  });

  it('returns false for wrong HMAC', () => {
    const svc = new PaymobService({
      apiKey: '', iframeId: '', hmacSecret: 'secret', integrationId: '',
    });
    const txn = buildMinimalTxn();
    expect(svc.verifyHmac(txn, 'wrong')).toBe(false);
  });

  it('returns true for correct HMAC-SHA512', () => {
    const secret = 'test-secret';
    const svc = new PaymobService({ apiKey: '', iframeId: '', hmacSecret: secret, integrationId: '' });
    const txn = buildMinimalTxn();
    // Compute expected HMAC using the same field order as verifyHmac
    const { createHmac } = await import('crypto');
    const concatenated = [/* same fields as verifyHmac */].join('');
    const expected = createHmac('sha512', secret).update(concatenated).digest('hex');
    expect(svc.verifyHmac(txn, expected)).toBe(true);
  });
});

function buildMinimalTxn(): PaymobTransaction {
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
```

**Important**: In the HMAC test that computes `expected`, use the **same field order** as your `verifyHmac` implementation. Don't hardcode it separately — import or inline the same list so both stay in sync.

---

## Step 9 — Verify

```bash
# Paymob tests
npx vitest run plugins/paymob --reporter=verbose 2>&1

# Full suite — must stay 1165+ pass, 0 fail
npm test 2>&1 | tail -5

# TypeScript — 0 errors in paymob files
npx tsc --noEmit 2>&1 | grep "plugins/paymob"
```

---

## Step 10 — Update AGENT_LOGBOOK.md

Append a dated entry:
- Files changed
- Exact HMAC field order confirmed from Paymob docs (copy the list)
- Whether docs showed any differences from the placeholder field list in this prompt
- New test count
- Any Paymob API behaviours that differ from what was assumed
