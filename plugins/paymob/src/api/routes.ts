import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import type { PaymobTransaction, PaymobWebhookPayload } from '../types.js';
import { PaymobService } from '../services/PaymobService.js';

function getConfig(api: PluginAPI): {
  apiKey: string;
  iframeId: string;
  hmacSecret: string;
  integrationId: string;
} {
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

export function registerRoutes(api: PluginAPI): void {
  const config = getConfig(api);
  const paymob = new PaymobService(config);

  api.registerRoute('/api/p/paymob/create-payment', {
    POST: async (req: Request) => {
      const session = await api.auth.getSession();
      if (!session) return json({ error: 'Unauthorized' }, 401);

      try {
        const body = await req.json();
        const { bookingId, amountCents, currency = 'EGP', billingData } = body;

        if (!bookingId || !amountCents || !billingData?.email) {
          return json({ error: 'bookingId, amountCents, and billingData.email are required' }, 400);
        }

        const result = await paymob.createPaymentIntent(
          bookingId,
          amountCents,
          currency,
          billingData
        );

        await api.db.execute(
          `INSERT INTO plugin_paymob_transactions (id, booking_id, order_id, amount_cents, currency, status, payment_key, created_at)
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

  api.registerRoute('/api/p/paymob/webhook', {
    POST: async (req: Request) => {
      try {
        const rawBody = await req.text();
        let parsed: PaymobWebhookPayload;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }

        const url = new URL(req.url);
        const hmac = url.searchParams.get('hmac') || '';
        if (!paymob.verifyHmac(parsed.obj, hmac)) {
          return json({ error: 'Invalid HMAC signature' }, 401);
        }

        const transaction: PaymobTransaction = parsed.obj;
        const paymentRef = transaction.id.toString();
        const idempotencyKey = `paymob-webhook-${paymentRef}`;

        const existing = await api.checkIdempotency(idempotencyKey);
        if (existing) {
          return json({ processed: true, status: existing.status });
        }

        const status = paymob.resolveStatus(transaction);

        await api.db.execute(
          `UPDATE plugin_paymob_transactions SET status = ?, updated_at = ? WHERE order_id = ?`,
          [status, new Date().toISOString(), transaction.order?.id?.toString()]
        );

        if (status === 'completed' || status === 'failed') {
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

          if (status === 'completed') {
            api.logger.info(`[paymob] Payment completed for order ${transaction.order?.id}`);
          }
        }

        return json({ processed: true, status });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.error(`[paymob] webhook error: ${msg}`);
        return json({ error: 'Webhook processing failed', details: msg }, 500);
      }
    },
  });

  api.registerRoute('/api/p/paymob/return', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const paymentKey = url.searchParams.get('payment_token') || '';
      const orderId = url.searchParams.get('order') || '';

      if (!paymentKey && !orderId) {
        return json({ success: false, message: 'Missing payment_token or order' }, 400);
      }

      try {
        const token = await paymob.getAuthToken();
        const transaction = await paymob.getTransaction(token, orderId);
        const status = paymob.resolveStatus(transaction);

        if (status === 'completed') {
          api.logger.info(`[paymob] Payment return success for order ${orderId}`);
          return json({ success: true, message: 'Payment completed successfully', orderId, status });
        }

        return json({ success: false, message: 'Payment was not completed', orderId, status });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.error(`[paymob] return inquiry failed: ${msg}`);
        return json({ success: false, message: 'Payment verification failed', orderId, details: msg });
      }
    },
  });

  api.registerRoute('/api/p/paymob/refund', {
    POST: async (req: Request) => {
      const session = await api.auth.getSession();
      if (!session) return json({ error: 'Unauthorized' }, 401);
      if (!['manager', 'owner', 'admin'].includes(session.user.role)) {
        return json({ error: 'Forbidden' }, 403);
      }

      try {
        const body = await req.json();
        const { transactionId, amountCents } = body;

        if (!transactionId || !amountCents) {
          return json({ error: 'transactionId and amountCents are required' }, 400);
        }

        const token = await paymob.getAuthToken();
        const result = await paymob.refundTransaction(token, transactionId, amountCents);

        await api.db.execute(
          `UPDATE plugin_paymob_transactions SET status = 'refunded', updated_at = ? WHERE order_id = ?`,
          [new Date().toISOString(), transactionId.toString()]
        );

        api.logger.info(`[paymob] Refund processed for transaction ${transactionId}`);
        return json({ success: true, refund: result });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger.error(`[paymob] refund failed: ${msg}`);
        return json({ error: 'Refund failed', details: msg }, 500);
      }
    },
  });
}
