import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index';
import { Hooks } from '../../../src/lib/hooks';

// Reusable mock factory
function createMockPluginAPI() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      addSlotComponent: vi.fn(),
      addSettingsPage: vi.fn(),
    },
    registerHook: vi.fn(),
    executeHook: vi.fn().mockResolvedValue({}),
    registerRoute: vi.fn(),
  };
}

// Mock feature flags
vi.mock('../../../src/lib/featureFlags.js', () => ({
  checkFlag: vi.fn().mockResolvedValue(true),
}));

describe('Loyalty Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes tables and UI components', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.db.createTable).toHaveBeenCalledWith('exchange_rates', expect.any(String));
    expect(api.db.createTable).toHaveBeenCalledWith('point_transactions', expect.any(String));
    expect(api.ui.addSlotComponent).toHaveBeenCalledWith(
      'guest.dashboard.cards',
      'loyalty:PointsWidget'
    );
    expect(api.ui.addSettingsPage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'loyalty-admin' })
    );
  });

  it('registers core lifecycle hooks', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.registerHook).toHaveBeenCalledWith(
      Hooks.PAYMENT_ON_SUCCESS,
      expect.any(Function),
      20
    );
    expect(api.registerHook).toHaveBeenCalledWith(
      Hooks.PRICING_CALCULATE,
      expect.any(Function),
      30
    );
    expect(api.registerHook).toHaveBeenCalledWith(
      Hooks.GUEST_CHECKED_OUT,
      expect.any(Function),
      10
    );
  });

  it('awards points on payment success', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const handler = (api.registerHook as any).mock.calls.find(
      (c: any) => c[0] === Hooks.PAYMENT_ON_SUCCESS
    )[1];

    const testData = {
      guestId: 'guest-1',
      amountUsd: 100,
      paymentId: 'pay-1',
    };

    await handler(testData);

    // Verify awardPoints was called (it logs via api.logger.info)
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('Awarded'));
  });

  it('applies points discount during pricing calculation', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({ loyalty_points: '1000' });
    await init(api as any);

    const handler = (api.registerHook as any).mock.calls.find(
      (c: any) => c[0] === Hooks.PRICING_CALCULATE
    )[1];

    const testData = {
      price: 200,
      guestId: 'guest-1',
      redeemPoints: 500,
    };

    const result = await handler(testData);

    // 500 points = $5 discount
    expect(result.price).toBe(195);
    expect(result.pointsRedeemed).toBe(500);
  });

  it('schedules a review request on checkout', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const handler = (api.registerHook as any).mock.calls.find(
      (c: any) => c[0] === Hooks.GUEST_CHECKED_OUT
    )[1];

    const testData = {
      guestId: 'guest-1',
      reservationId: 'res-1',
      totalSpend: 500,
    };

    await handler(testData);

    expect(api.executeHook).toHaveBeenCalledWith(
      Hooks.NOTIFICATION_SEND,
      expect.objectContaining({
        type: 'review_request',
        guestId: 'guest-1',
      })
    );
  });

  it('returns early in payment hook if data is missing', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const handler = (api.registerHook as any).mock.calls.find(
      (c: any) => c[0] === Hooks.PAYMENT_ON_SUCCESS
    )[1];

    const result = await handler({ guestId: 'guest-1' }); // missing amountUsd
    expect(result).toEqual({ guestId: 'guest-1' });
    expect(api.db.queryOne).not.toHaveBeenCalled();
  });

  it('handles notification.send hook', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const handler = (api.registerHook as any).mock.calls.find(
      (c: any) => c[0] === Hooks.NOTIFICATION_SEND
    )[1];

    const testData = {
      type: 'welcome',
      guestId: 'guest-1',
      channel: 'sms',
    };

    const result = await handler(testData);
    expect(result).toEqual(testData);
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('notification.send type=welcome guest=guest-1 channel=sms')
    );
  });
});
