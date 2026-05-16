import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index.js';

// ── Mock API builder ──────────────────────────────────────────────────────────

function buildMockApi(dbOverrides: Record<string, unknown> = {}) {
  const routes: Array<{ path: string; methods: string[] }> = [];
  const slots: Array<{ slot: string; key: string }> = [];
  const hooks: Array<{ name: string }> = [];
  const hookExecutions: Array<{ name: string; data: unknown }> = [];
  const createdTables: Array<{ suffix: string }> = [];

  return {
    pluginId: 'resource',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },

    db: {
      createTable: vi.fn().mockImplementation(async (suffix: string) => {
        createdTables.push({ suffix });
      }),
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      ...dbOverrides,
    },

    registerRoute: vi.fn().mockImplementation((path: string, handler: unknown) => {
      const methods =
        typeof handler === 'object' && handler !== null ? Object.keys(handler) : ['POST'];
      routes.push({ path, methods });
    }),

    hooks: {
      registerHook: vi.fn().mockImplementation((name: string) => {
        hooks.push({ name });
        return () => {};
      }),
      executeHook: vi.fn().mockImplementation(async (name: string, data: unknown) => {
        hookExecutions.push({ name, data });
        return data;
      }),
    },

    registerHook: vi.fn(),
    executeHook: vi.fn(),

    ui: {
      addSlotComponent: vi.fn().mockImplementation((slot: string, key: string) => {
        slots.push({ slot, key });
      }),
      registerSlot: vi.fn(),
      registerMenuItem: vi.fn(),
      addMenuItem: vi.fn(),
      registerDashboardWidget: vi.fn(),
      addDashboardWidget: vi.fn(),
      registerSettingsPage: vi.fn(),
      addSettingsPage: vi.fn(),
    },

    config: {},

    // Expose internal state for assertions
    _internal: { routes, slots, hooks, hookExecutions, createdTables },
  };
}

// ── Plugin Lifecycle ─────────────────────────────────────────────────────────

describe('resource plugin: init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    await init(api as any);
  });

  it('creates the listings table', () => {
    expect(api.db.createTable).toHaveBeenCalledWith(
      'listings',
      expect.stringContaining('tenant_id')
    );
    expect(api.db.createTable).toHaveBeenCalledWith('listings', expect.stringContaining('slug'));
  });

  it('registers all 5 routes', () => {
    const paths = api._internal.routes.map((r) => r.path);
    expect(paths).toContain('/api/p/resource/listings');
    expect(paths).toContain('/api/p/resource/listings/:slug');
    expect(paths).toContain('/api/p/resource/master/listings');
    expect(paths).toContain('/api/p/resource/master/listings/:id');
    expect(paths).toContain('/api/p/resource/manage/listings/:id');
  });

  it('registers all 5 UI slot components', () => {
    const slotNames = api._internal.slots.map((s) => s.slot);
    expect(slotNames).toContain('public.homepage');
    expect(slotNames).toContain('public.search');
    expect(slotNames).toContain('public.listing-detail');
    expect(slotNames).toContain('master.listings');
    expect(slotNames).toContain('manage.property');
  });

  it('registers LISTING_CREATED, LISTING_UPDATED, and PROPERTY_REGISTERED hooks', async () => {
    await init(api as any);
    expect(api.hooks.registerHook).toHaveBeenCalledWith(
      'LISTING_CREATED',
      expect.any(Function),
      10
    );
    expect(api.hooks.registerHook).toHaveBeenCalledWith(
      'LISTING_UPDATED',
      expect.any(Function),
      10
    );
    expect(api.hooks.registerHook).toHaveBeenCalledWith(
      'PROPERTY_REGISTERED',
      expect.any(Function),
      10
    );
  });

  it('PROPERTY_REGISTERED hook listener executes core DB setup', async () => {
    let hookHandler: any;
    api.hooks.registerHook = vi.fn().mockImplementation((name, handler) => {
      if (name === 'PROPERTY_REGISTERED') hookHandler = handler;
      return () => {};
    });

    await init(api as any);
    expect(hookHandler).toBeDefined();

    await hookHandler({
      propertyId: 'p-1',
      title: 'New Prop',
      slug: 'new-prop',
      ownerEmail: 'owner@example.com',
      tier: 'premium',
    });

    // Check that core execute queries were called
    expect(api.db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO properties'),
      expect.arrayContaining(['p-1', 'new-prop', 'New Prop'])
    );
    expect(api.db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining(['owner@example.com'])
    );
    expect(api.db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE plugin_resource_listings SET is_active = 1'),
      ['p-1']
    );
    expect(api.db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO property_plugins'),
      expect.arrayContaining(['p-1', 'booking'])
    );
  });

  it('logs "ready" on success', async () => {
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('ready'));
  });
});
