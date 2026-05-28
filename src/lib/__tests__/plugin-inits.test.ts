/**
 * Plugin Init Coverage Tests
 * ==========================
 * Exercises the init() function of every plugin using a mock PluginAPI.
 * Uses static top-level imports so that v8 coverage instruments every file.
 */

import { describe, it, expect, vi } from 'vitest';
import activitiesInit from '../../../plugins/activities/src/index';
import guestCrmInit from '../../../plugins/guest-crm/src/index';
import housekeepingInit from '../../../plugins/housekeeping/src/index';
import staffRosterInit from '../../../plugins/staff-roster/src/index';
import listingAdminInit from '../../../plugins/listing-admin/src/index';
import otaInit from '../../../plugins/ota-channel-manager/src/index';
import posInit from '../../../plugins/pos-kds/src/index';
import inventoryInit from '../../../plugins/inventory-waste/src/index';

// ─── buildMockApi ─────────────────────────────────────────────────────────────

function buildMockApi() {
  const mockTable = {
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      getTable: vi.fn().mockReturnValue(mockTable),
    },
    ui: {
      addSlotComponent: vi.fn(),
      registerMenuItem: vi.fn(),
      addSettingsPage: vi.fn(),
      addDashboardWidget: vi.fn(),
    },
    hooks: {
      register: vi.fn(),
      execute: vi.fn().mockResolvedValue(undefined),
    },
    registerRoute: vi.fn(),
    registerHook: vi.fn().mockReturnValue(() => {}),
    config: {},
  };
}

// ─── activities plugin ────────────────────────────────────────────────────────

describe('activities plugin init', () => {
  it('registers /api/activities route', async () => {
    const api = buildMockApi();
    await activitiesInit(api as any);
    expect(api.registerRoute).toHaveBeenCalledWith(
      expect.stringContaining('activities'),
      expect.anything()
    );
    expect(api.logger.info).toHaveBeenCalledTimes(2);
  });
});

// ─── guest-crm plugin ─────────────────────────────────────────────────────────

describe('guest-crm plugin init', () => {
  it('registers /api/crm route and after_create hook', async () => {
    const api = buildMockApi();
    await guestCrmInit(api as any);
    expect(api.registerRoute).toHaveBeenCalledWith(
      expect.stringContaining('crm'),
      expect.anything()
    );
    expect(api.hooks.register).toHaveBeenCalledWith(
      'reservation:after_create',
      expect.any(Function)
    );
  });

  it('hook handler logs and returns data unchanged', async () => {
    const api = buildMockApi();
    await guestCrmInit(api as any);
    const [, hookFn] = (api.hooks.register as any).mock.calls[0];
    const data = { id: 'res-1', guestName: 'Alice' };
    const result = await hookFn(data);
    expect(result).toBe(data);
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('res-1'));
  });
});

// ─── housekeeping plugin ──────────────────────────────────────────────────────

describe('housekeeping plugin init', () => {
  it('registers /api/housekeeping route', async () => {
    const api = buildMockApi();
    await housekeepingInit(api as any);
    expect(api.registerRoute).toHaveBeenCalledWith(
      expect.stringContaining('housekeeping'),
      expect.anything()
    );
  });

  it('registers reservation:after_checkout hook', async () => {
    const api = buildMockApi();
    await housekeepingInit(api as any);
    expect(api.hooks.register).toHaveBeenCalledWith(
      'reservation:after_checkout',
      expect.any(Function)
    );
  });

  it('checkout hook creates cleaning task and returns data', async () => {
    const api = buildMockApi();
    await housekeepingInit(api as any);
    const [, hookFn] = (api.hooks.register as any).mock.calls[0];
    const data = { room_id: 'room-1' };
    const result = await hookFn(data);
    expect(api.db.execute).toHaveBeenCalled();
    expect(result).toBe(data);
  });
});

// ─── staff-roster plugin ──────────────────────────────────────────────────────

describe('staff-roster plugin init', () => {
  it('registers /api/staff/roster route', async () => {
    const api = buildMockApi();
    await staffRosterInit(api as any);
    expect(api.registerRoute).toHaveBeenCalledWith(
      expect.stringContaining('roster'),
      expect.anything()
    );
    expect(api.logger.info).toHaveBeenCalledTimes(2);
  });
});

// ─── listing-admin plugin ─────────────────────────────────────────────────────

describe('listing-admin plugin init', () => {
  it('registers dashboard widget', async () => {
    const api = buildMockApi();
    await listingAdminInit(api as any);
    expect(api.ui.addDashboardWidget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'property-stats' })
    );
  });

  it('registers dashboard.get_stats hook', async () => {
    const api = buildMockApi();
    await listingAdminInit(api as any);
    expect(api.registerHook).toHaveBeenCalledWith('dashboard.get_stats', expect.any(Function));
  });

  it('get_stats hook computes revenue from reservations', async () => {
    const api = buildMockApi();
    (api.db.getTable as any).mockReturnValue({
      findMany: vi.fn().mockResolvedValue([{ total_price: 1000 }, { total_price: 500 }]),
    });
    await listingAdminInit(api as any);
    const [, hookFn] = (api.registerHook as any).mock.calls[0];
    const result = await hookFn({});
    expect(result.revenue).toBe(1500);
    expect(result.bookingCount).toBe(2);
    expect(result.fees).toBeCloseTo(180);
  });

  it('get_stats hook returns zero revenue for empty reservations', async () => {
    const api = buildMockApi();
    await listingAdminInit(api as any);
    const [, hookFn] = (api.registerHook as any).mock.calls[0];
    const result = await hookFn({});
    expect(result.revenue).toBe(0);
    expect(result.fees).toBe(0);
    expect(result.netPayout).toBe(0);
  });
});

// ─── ota-channel-manager plugin ───────────────────────────────────────────────

describe('ota-channel-manager plugin init', () => {
  it('registers /api/ota route', async () => {
    const api = buildMockApi();
    await otaInit(api as any);
    expect(api.registerRoute).toHaveBeenCalledWith(
      expect.stringContaining('ota'),
      expect.anything()
    );
  });
});

// ─── pos-kds plugin ───────────────────────────────────────────────────────────

describe('pos-kds plugin init', () => {
  it('registers pos and order routes', async () => {
    const api = buildMockApi();
    await posInit(api as any);
    const calls = (api.registerRoute as any).mock.calls.map((c: any[]) => c[0]);
    expect(calls.some((r: string) => r.includes('pos'))).toBe(true);
  });
});

// ─── inventory-waste plugin ───────────────────────────────────────────────────

describe('inventory-waste plugin init', () => {
  it('registers inventory and waste routes', async () => {
    const api = buildMockApi();
    await inventoryInit(api as any);
    const calls = (api.registerRoute as any).mock.calls.map((c: any[]) => c[0]);
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
