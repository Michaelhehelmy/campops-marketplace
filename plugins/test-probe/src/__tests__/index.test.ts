import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISlots } from '../../../../packages/plugin-sdk/src/ui.js';

function buildMockApi(overrides: Record<string, unknown> = {}) {
  const routes: Array<{ method: string; path: string }> = [];
  const menuItems: unknown[] = [];
  const slots: Array<{ slot: string; key: string }> = [];
  const createdTables: Array<{ suffix: string; columnsSql: string }> = [];
  const hookRegistrations: Array<{ name: string }> = [];
  const hookExecutions: Array<{ name: string; data: unknown }> = [];

  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    pluginId: 'test-probe',
    routes: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    registerRoute(path: string, router: unknown) {
      routes.push({ method: 'ANY', path });
      return router;
    },
    hooks: {
      registerHook(name: string, _handler: unknown) {
        hookRegistrations.push({ name });
        return () => {};
      },
      executeHook: vi.fn().mockImplementation(async (name: string, data: unknown) => {
        hookExecutions.push({ name, data });
        return data;
      }),
    },
    registerHook: vi.fn(),
    executeHook: vi.fn(),
    ui: {
      registerMenuItem(item: unknown) {
        menuItems.push(item);
      },
      addMenuItem(item: unknown) {
        menuItems.push(item);
      },
      registerSlot(slotName: string, key: string) {
        slots.push({ slot: slotName, key });
      },
      addSlotComponent(slotName: string, key: string) {
        slots.push({ slot: slotName, key });
      },
      registerDashboardWidget: vi.fn(),
      addDashboardWidget: vi.fn(),
      registerSettingsPage: vi.fn(),
      addSettingsPage: vi.fn(),
    },
    db: {
      createTable(suffix: string, columnsSql: string) {
        createdTables.push({ suffix, columnsSql });
        return Promise.resolve();
      },
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      tableExists: vi.fn().mockResolvedValue(false),
      dropTable: vi.fn().mockResolvedValue(undefined),
    },
    config: {},
    _internal: { routes, menuItems, slots, createdTables, hookRegistrations, hookExecutions },
    ...overrides,
  };
}

describe('test-probe plugin init()', () => {
  let api: ReturnType<typeof buildMockApi>;

  beforeEach(async () => {
    api = buildMockApi();
    const { init } = await import('../index.js');
    await init(api as any);
  });

  it('creates the probes table via api.db.createTable', () => {
    const created = api._internal.createdTables;
    expect(created.length).toBeGreaterThanOrEqual(1);
    const probe = created.find((t) => t.suffix === 'probes');
    expect(probe).toBeDefined();
    expect(probe!.columnsSql).toContain('key');
    expect(probe!.columnsSql).toContain('value');
  });

  it('registers routes under /api/test-probe/*', () => {
    const routes = api._internal.routes;
    // Plugin registers /api/test-probe/ping, /api/test-probe/echo, /api/test-probe/rows
    const probeRoutes = routes.filter((r) => r.path.startsWith('/api/test-probe'));
    expect(probeRoutes.length).toBeGreaterThanOrEqual(1);
  });

  it('registers the test-probe.echo hook', () => {
    const hooks = api._internal.hookRegistrations;
    const echoHook = hooks.find((h) => h.name === 'test-probe.echo');
    expect(echoHook).toBeDefined();
  });

  it('registers a menu item pointing to /admin/test-probe', () => {
    const items = api._internal.menuItems;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const item = items.find((m: any) => m.path === '/admin/test-probe');
    expect(item).toBeDefined();
    expect((item as any).label).toBeDefined();
  });

  it('registers a slot into DASHBOARD_WIDGETS (string literal)', () => {
    const slots = api._internal.slots;
    // Plugin calls api.ui.registerSlot('DASHBOARD_WIDGETS', ...) using the string literal
    const widget = slots.find(
      (s) => s.slot === 'DASHBOARD_WIDGETS' || s.slot === UISlots.DASHBOARD_WIDGETS
    );
    expect(widget).toBeDefined();
    expect(widget!.key).toContain('test-probe');
  });

  it('registers a slot into listing.sidebar', () => {
    const slots = api._internal.slots;
    const sidebar = slots.find((s) => s.slot === 'listing.sidebar');
    expect(sidebar).toBeDefined();
    expect(sidebar!.key).toContain('test-probe');
  });

  it('logs info that plugin is ready', () => {
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('ready'));
  });
});

describe('UISlots catalogue (core contract)', () => {
  it("DASHBOARD_WIDGETS equals 'dashboard.widgets'", () => {
    expect(UISlots.DASHBOARD_WIDGETS).toBe('dashboard.widgets');
  });

  it("NAV_MAIN equals 'nav.main'", () => {
    expect(UISlots.NAV_MAIN).toBe('nav.main');
  });

  it('all slot values are non-empty strings', () => {
    for (const [, v] of Object.entries(UISlots)) {
      expect(typeof v).toBe('string');
      expect((v as string).length).toBeGreaterThan(0);
    }
  });
});
