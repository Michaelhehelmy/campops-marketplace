/**
 * Starter plugin unit tests.
 * Uses a mock PluginAPI so the plugin can be tested without a running server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './index.js';
function makeMockApi() {
  return {
    pluginId: 'my-plugin',
    version: '1.0.0',
    config: {},
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    registerHook: vi.fn().mockReturnValue(() => {}),
    executeHook: vi.fn().mockImplementation(async (_name, data) => data),
    db: {
      rooms: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      reservations: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      guests: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      folios: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      roomTypes: {
        findMany: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    services: {
      payment: { initiatePayment: vi.fn() },
      tax: { calculateTaxes: vi.fn() },
      notification: { send: vi.fn() },
      i18n: { t: vi.fn().mockReturnValue('') },
    },
    publish: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    ui: {
      addSlotComponent: vi.fn(),
      addMenuItem: vi.fn(),
      addDashboardWidget: vi.fn(),
      addSettingsPage: vi.fn(),
    },
  };
}
describe('my-plugin init', () => {
  let api;
  beforeEach(() => {
    api = makeMockApi();
  });
  it('registers required hooks', async () => {
    await init(api);
    const registeredNames = api.registerHook.mock.calls.map((c) => c[0]);
    expect(registeredNames).toContain('payment.on_success');
    expect(registeredNames).toContain('pricing.calculate');
  });
  it('adds a menu item', async () => {
    await init(api);
    expect(api.ui.addMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/admin/my-plugin' })
    );
  });
  it('pricing hook applies early-bird discount for price > 100', async () => {
    await init(api);
    const pricingCall = api.registerHook.mock.calls.find((c) => c[0] === 'pricing.calculate');
    const handler = pricingCall?.[1];
    expect(handler).toBeDefined();
    const result = await handler({ price: 150, guestId: 'guest-1' });
    expect(result.price).toBe(145);
  });
  it('pricing hook does NOT discount for price <= 100', async () => {
    await init(api);
    const pricingCall = api.registerHook.mock.calls.find((c) => c[0] === 'pricing.calculate');
    const handler = pricingCall?.[1];
    const result = await handler({ price: 80, guestId: 'guest-2' });
    expect(result.price).toBe(80);
  });
});
