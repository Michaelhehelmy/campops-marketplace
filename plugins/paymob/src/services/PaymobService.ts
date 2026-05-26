import { createHmac } from 'crypto';
import type {
  PaymobConfig,
  PaymobAuthResponse,
  PaymobOrderResponse,
  PaymobPaymentKeyResponse,
  PaymobTransaction,
} from '../types.js';

const PAYMOB_BASE = 'https://accept.paymob.com/api';

function createBasicHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

function createAuthHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export class PaymobService {
  private config: PaymobConfig;

  constructor(config: PaymobConfig) {
    this.config = config;
  }

  /** Authenticate with Paymob API and return an access token. */
  async getAuthToken(): Promise<string> {
    const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: 'POST',
      headers: createBasicHeaders(),
      body: JSON.stringify({ api_key: this.config.apiKey }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paymob auth failed (${res.status}): ${body}`);
    }
    const data: PaymobAuthResponse = await res.json();
    return data.token;
  }

  /** Register an order in Paymob system. */
  async registerOrder(
    token: string,
    merchantOrderId: string,
    amountCents: number,
    currency: string
  ): Promise<PaymobOrderResponse> {
    const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: 'POST',
      headers: createAuthHeaders(token),
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: currency,
        merchant_order_id: merchantOrderId,
        items: [],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paymob order registration failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /** Get a payment key to open the iframe. */
  async getPaymentKey(
    token: string,
    orderId: number,
    amountCents: number,
    currency: string,
    billingData: Record<string, string>
  ): Promise<PaymobPaymentKeyResponse> {
    const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: 'POST',
      headers: createAuthHeaders(token),
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billingData,
        currency: currency,
        integration_id: parseInt(this.config.integrationId, 10),
        lock_order_when_paid: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paymob payment key failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /** Build the iframe URL from a payment token. */
  getIframeUrl(paymentToken: string): string {
    return `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${paymentToken}`;
  }

  /** Verify HMAC signature on a webhook payload via timing-safe comparison. */
  verifyHmac(transaction: PaymobTransaction, receivedHmac: string): boolean {
    if (!this.config.hmacSecret) {
      if (process.env.NODE_ENV === 'production') return false;
      return true;
    }
    if (!receivedHmac) return false;

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

    if (expected.length !== receivedHmac.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ receivedHmac.charCodeAt(i);
    }
    return diff === 0;
  }

  /** Determine the local status from a Paymob transaction. */
  resolveStatus(txn: PaymobTransaction): string {
    if (txn.is_void || txn.is_refund) return 'refunded';
    if (txn.success) return 'completed';
    if (txn.pending) return 'pending';
    if (txn.error_occured) return 'failed';
    return 'unknown';
  }

  /** Full payment intent creation flow. */
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

  /** Look up a transaction by ID via Paymob Transaction Inquiry API. */
  async getTransaction(token: string, transactionId: string): Promise<PaymobTransaction> {
    const res = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${transactionId}`, {
      headers: createAuthHeaders(token),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paymob inquiry failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /** Refund a transaction via Paymob Refund API. */
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
}
