/**
 * Loyalty Plugin – Phase 6
 * ─────────────────────────
 * Wraps the existing LoyaltyService (server/services/LoyaltyService.ts) into
 * the SinaiCamps plugin system.
 *
 * Hooks registered:
 *   payment:success     (priority 20) — award points proportional to payment amount
 *   pricing:calculate   (priority 30) — apply points discount if ctx.redeemPoints set
 *   CHECKOUT_COMPLETED  (priority 10) — trigger tier check + schedule review request
 *   notification:send   (priority 50) — log notification (replace with email adapter)
 *
 * Requires crm_marketing feature flag.
 * Registered in plugin-manifest.json as "loyalty".
 */

import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { LoyaltyService } from './LoyaltyService.js';
import { Hooks } from '../../../src/lib/hooks.js';
import { checkFlag } from '../../../src/lib/featureFlags.js';

export default async function init(api: PluginAPI): Promise<void> {
  // ── Database Setup ─────────────────────────────────────────────────────────
  // Register plugin-specific tables
  await api.db.createTable(
    'exchange_rates',
    `
    currency_code TEXT NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    is_active BOOLEAN DEFAULT true
  `
  );

  await api.db.createTable(
    'point_transactions',
    `
    guest_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
  `
  );

  // ── Indexes ─────────────────────────────────────────────────────────────────
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_pt_guest ON plugin_loyalty_point_transactions(guest_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_er_currency ON plugin_loyalty_exchange_rates(currency_code)');

  // ── payment:success → award points ────────────────────────────────────────
  api.registerHook(
    Hooks.PAYMENT_ON_SUCCESS,
    async (data: {
      guestId?: string;
      amountUsd?: number;
      paymentId?: string;
      vipLevel?: string;
    }) => {
      const enabled = await checkFlag('crm_marketing');
      if (!enabled || !data.guestId || !data.amountUsd) return data;

      try {
        const guest = await api.db.queryOne('SELECT vip_level FROM guests WHERE id = ?', [
          data.guestId,
        ]);

        const points = LoyaltyService.calculateEarnedPoints(
          data.amountUsd,
          100, // exchangeRate — 1 USD = 100 points base
          5, // earnPercent
          guest?.vip_level ?? data.vipLevel ?? 'regular',
          2 // vipMultiplier
        );

        if (points > 0) {
          await LoyaltyService.awardPoints(
            api.db as any,
            data.guestId,
            points,
            data.paymentId,
            `Earned from payment of $${data.amountUsd.toFixed(2)}`
          );
          await LoyaltyService.checkAndUpgradeTier(api.db as any, data.guestId);
          api.logger.info(`[loyalty] Awarded ${points} points to guest ${data.guestId}`);
        }
      } catch (err: any) {
        api.logger.info(`[loyalty] payment:success error: ${err.message}`);
      }

      return data;
    },
    20
  );

  // ── pricing:calculate → apply points redemption discount ──────────────────
  api.registerHook(
    Hooks.PRICING_CALCULATE,
    async (data: { price: number; guestId?: string; redeemPoints?: number }) => {
      const enabled = await checkFlag('crm_marketing');
      if (!enabled || !data.redeemPoints || !data.guestId) return data;

      try {
        const guest = await api.db.queryOne('SELECT loyalty_points FROM guests WHERE id = ?', [
          data.guestId,
        ]);

        const available = parseInt(guest?.loyalty_points ?? '0');
        const toRedeem = Math.min(data.redeemPoints, available);
        if (toRedeem <= 0) return data;

        // 100 points = $1 discount
        const discountUsd = toRedeem / 100;
        const newPrice = Math.max(0, data.price - discountUsd);

        await LoyaltyService.redeemPoints(
          api.db as any,
          data.guestId,
          toRedeem,
          undefined,
          `Redeemed ${toRedeem} Beats for $${discountUsd.toFixed(2)} discount`
        );

        api.logger.info(
          `[loyalty] Redeemed ${toRedeem} points for guest ${data.guestId} — price $${data.price} → $${newPrice}`
        );

        return { ...data, price: newPrice, pointsRedeemed: toRedeem };
      } catch (err: any) {
        api.logger.info(`[loyalty] pricing:calculate error: ${err.message}`);
        return data;
      }
    },
    30
  );

  // ── booking.created → award welcome points ────────────────────────────────
  api.registerHook(
    Hooks.BOOKING_CREATED,
    async (data: { bookingId: string; guestEmail: string; guestName: string }) => {
      const enabled = await checkFlag('crm_marketing');
      if (!enabled) return data;

      try {
        // Try to find guest by email
        const guest = await api.db.queryOne('SELECT id FROM guests WHERE email = ?', [
          data.guestEmail,
        ]);

        if (guest) {
          await LoyaltyService.awardPoints(
            api.db as any,
            guest.id,
            500, // 500 welcome points
            data.bookingId,
            `Welcome bonus for booking ${data.bookingId}`
          );
          api.logger.info(`[loyalty] Awarded 500 welcome points to guest ${guest.id}`);
        }
      } catch (err: any) {
        api.logger.info(`[loyalty] booking.created error: ${err.message}`);
      }

      return data;
    },
    10
  );

  // ── CHECKOUT_COMPLETED → tier check + schedule review request ──────────────
  api.registerHook(
    Hooks.GUEST_CHECKED_OUT,
    async (data: {
      guestId?: string;
      reservationId?: string;
      checkOut?: string;
      totalSpend?: number;
    }) => {
      const enabled = await checkFlag('crm_marketing');
      if (!enabled || !data.guestId) return data;

      try {
        // Update total_stays + total_spend_usd + last_visit on the guests row
        if (data.totalSpend) {
          await api.db.execute(
            `UPDATE guests
             SET total_stays    = total_stays + 1,
                 total_spend_usd = total_spend_usd + ?,
                 last_visit      = CURRENT_TIMESTAMP,
                 updated_at      = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [data.totalSpend, data.guestId]
          );
        } else {
          await api.db.execute(
            `UPDATE guests
             SET total_stays = total_stays + 1,
                 last_visit   = CURRENT_TIMESTAMP,
                 updated_at   = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [data.guestId]
          );
        }

        // Tier check after spend update
        await LoyaltyService.checkAndUpgradeTier(api.db as any, data.guestId);

        // Schedule review request 3 days after checkout
        const reviewAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        await api.executeHook(Hooks.NOTIFICATION_SEND, {
          type: 'review_request',
          guestId: data.guestId,
          reservationId: data.reservationId,
          scheduledAt: reviewAt,
          channel: 'email',
        });

        api.logger.info(
          `[loyalty] CHECKOUT_COMPLETED processed for ${data.guestId}; review request scheduled at ${reviewAt}`
        );
      } catch (err: any) {
        api.logger.info(`[loyalty] CHECKOUT_COMPLETED error: ${err.message}`);
      }

      return data;
    },
    10
  );

  // ── notification:send → log handler (replace with email adapter in prod) ──
  api.registerHook(
    Hooks.NOTIFICATION_SEND,
    async (data: {
      type?: string;
      guestId?: string;
      channel?: string;
      scheduledAt?: string;
      [key: string]: any;
    }) => {
      api.logger.info(
        `[loyalty] notification:send type=${data.type} guest=${data.guestId} ` +
          `channel=${data.channel ?? 'email'} scheduledAt=${data.scheduledAt ?? 'immediate'}`
      );
      return data;
    },
    10
  );

  // ── UI: register components into slots ───────────────────────────────────
  api.ui.addSlotComponent('guest.dashboard.cards', 'loyalty:PointsWidget');

  api.ui.addSettingsPage({
    id: 'loyalty-admin',
    label: 'Loyalty Management',
    icon: 'award',
    component: 'loyalty:AdminPage',
  });

  api.logger.info('[loyalty] Plugin initialised — tables created, hooks + UI registered');
}
