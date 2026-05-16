import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './index.js';
import { createMockPluginAPI } from '../../plugin-testing/src/index.js';
import type { PluginAPI } from '../../plugin-sdk/src/types.js';

describe('my-plugin init', () => {
  let api: PluginAPI;

  beforeEach(() => {
    api = createMockPluginAPI('my-plugin') as any;
    // Add vi.fn() to the mocks if we want to spy
    api.registerHook = vi.fn(api.registerHook);
    api.ui.addMenuItem = vi.fn();
  });

  it('registers required hooks', async () => {
    await init(api);
    const registeredNames = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: any[]) => c[0]
    );
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
    const pricingCall = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'pricing.calculate'
    );
    const handler = pricingCall?.[1];
    expect(handler).toBeDefined();

    const result = await handler({ price: 150, guestId: 'guest-1' });
    expect(result.price).toBe(145);
  });

  it('pricing hook does NOT discount for price <= 100', async () => {
    await init(api);
    const pricingCall = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'pricing.calculate'
    );
    const handler = pricingCall?.[1];
    const result = await handler({ price: 80, guestId: 'guest-2' });
    expect(result.price).toBe(80);
  });
});
