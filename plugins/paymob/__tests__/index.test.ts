import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index.js';
import { createMockPluginAPI } from '../../../packages/plugin-testing/src/index.js';
import type { PluginAPI } from '../../../packages/plugin-sdk/src/types.js';

describe('paymob plugin', () => {
  let api: PluginAPI;

  beforeEach(() => {
    vi.stubEnv('PAYMOB_API_KEY', 'test-api-key');
    vi.stubEnv('PAYMOB_IFRAME_ID', '12345');
    vi.stubEnv('PAYMOB_HMAC_SECRET', 'test-hmac-secret');
    vi.stubEnv('PAYMOB_INTEGRATION_ID', '67890');

    api = createMockPluginAPI('paymob') as unknown as PluginAPI;

    api.db.tableExists = vi.fn().mockResolvedValue(false);
    api.db.createTable = vi.fn().mockResolvedValue(undefined);
    api.db.execute = vi.fn().mockResolvedValue(undefined);
    api.db.query = vi.fn().mockResolvedValue([]);
    api.logger.info = vi.fn();
    api.logger.error = vi.fn();
    api.registerRoute = vi.fn();
    api.registerHook = vi.fn();
    api.checkIdempotency = vi.fn().mockResolvedValue(null);
    api.storeIdempotency = vi.fn().mockResolvedValue(undefined);
  });

  it('creates the transactions table on init', async () => {
    await init(api);
    expect(api.db.tableExists).toHaveBeenCalledWith('transactions');
    expect(api.db.createTable).toHaveBeenCalledWith(
      'transactions',
      expect.stringContaining('id TEXT PRIMARY KEY')
    );
  });

  it('skips table creation if already exists', async () => {
    api.db.tableExists = vi.fn().mockResolvedValue(true);
    await init(api);
    expect(api.db.createTable).not.toHaveBeenCalled();
  });

  it('registers payment.collect_methods hook', async () => {
    await init(api);
    expect(api.registerHook).toHaveBeenCalledWith('payment.collect_methods', expect.any(Function));
  });

  it('registers payment.on_success hook', async () => {
    await init(api);
    expect(api.registerHook).toHaveBeenCalledWith('payment.on_success', expect.any(Function));
  });

  it('registers three API routes', async () => {
    await init(api);
    const routeCalls = (api.registerRoute as ReturnType<typeof vi.fn>).mock.calls;
    const paths = routeCalls.map((c: any[]) => c[0]);
    expect(paths).toContain('/api/p/paymob/create-payment');
    expect(paths).toContain('/api/p/paymob/webhook');
    expect(paths).toContain('/api/p/paymob/return');
  });

  it('payment.collect_methods hook adds paymob to methods', async () => {
    await init(api);
    const hookCall = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'payment.collect_methods'
    );
    expect(hookCall).toBeDefined();
    const handler = hookCall![1];
    const result = await handler({ methods: [{ id: 'stripe', name: 'Stripe', type: 'card' }] });
    expect(result.methods).toHaveLength(2);
    expect(result.methods[1]).toMatchObject({ id: 'paymob', name: 'Paymob' });
  });

  it('payment.on_success hook logs for paymob gateway', async () => {
    await init(api);
    const hookCall = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'payment.on_success'
    );
    expect(hookCall).toBeDefined();
    const handler = hookCall![1];
    const result = await handler({ gateway: 'paymob', bookingId: 'b-1' });
    expect(result).toEqual({ gateway: 'paymob', bookingId: 'b-1' });
  });

  it('payment.on_success hook passes through non-paymob data unchanged', async () => {
    await init(api);
    const hookCall = (api.registerHook as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'payment.on_success'
    );
    expect(hookCall).toBeDefined();
    const handler = hookCall![1];
    const data = { gateway: 'stripe', bookingId: 'b-2' };
    const result = await handler(data);
    expect(result).toEqual(data);
  });
});
