import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISlots } from '../../../../packages/plugin-sdk/src/ui.js';

// ── Build a mock PluginAPI ─────────────────────────────────────────────────────

function buildMockAPI() {
  const routes: Array<{ method: string; path: string; handler: any }> = [];
  const menuItems: any[] = [];
  const registeredSlots: Array<{ slot: string; key: string }> = [];
  const createdTables: Array<{ suffix: string; columnsSql: string }> = [];
  const hookRegistrations: Array<{ name: string; handler: any }> = [];

  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    routes: {
      get(path: string, ...args: any[]) {
        routes.push({ method: 'GET', path, handler: args[args.length - 1] });
      },
      post(path: string, ...args: any[]) {
        routes.push({ method: 'POST', path, handler: args[args.length - 1] });
      },
      put(path: string, ...args: any[]) {
        routes.push({ method: 'PUT', path, handler: args[args.length - 1] });
      },
      delete(path: string, ...args: any[]) {
        routes.push({ method: 'DELETE', path, handler: args[args.length - 1] });
      },
    },
    hooks: {
      register(name: string, handler: any) {
        hookRegistrations.push({ name, handler });
        return () => {};
      },
      registerHook(name: string, handler: any) {
        hookRegistrations.push({ name, handler });
        return () => {};
      },
      execute: vi.fn(),
      executeHook: vi.fn(),
    },
    registerHook(name: string, handler: any) {
      hookRegistrations.push({ name, handler });
      return () => {};
    },
    executeHook: vi.fn(),
    registerRoute(path: string, router: any) {
      routes.push({ method: 'ANY', path, handler: router });
    },
    ui: {
      registerMenuItem(item: any) {
        menuItems.push(item);
      },
      addMenuItem(item: any) {
        menuItems.push(item);
      },
      registerSlot(slotName: string, key: string) {
        registeredSlots.push({ slot: slotName, key });
      },
      addSlotComponent(slotName: string, key: string) {
        registeredSlots.push({ slot: slotName, key });
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
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue(undefined),
      tableExists: vi.fn().mockResolvedValue(false),
      dropTable: vi.fn().mockResolvedValue(undefined),
      rooms: {} as any,
      reservations: {} as any,
      guests: {} as any,
      folios: {} as any,
      roomTypes: {} as any,
    },
    config: {},
    pluginId: 'test-dock',
    _internal: { routes, menuItems, registeredSlots, createdTables, hookRegistrations },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('test-dock plugin init()', () => {
  let api: ReturnType<typeof buildMockAPI>;

  beforeEach(async () => {
    api = buildMockAPI();
    const { init } = await import('../index.js');
    await init(api as any);
  });

  it('creates the dummy table via api.db.createTable', () => {
    const created = (api as any)._internal.createdTables;
    expect(created.length).toBeGreaterThanOrEqual(1);
    const dummy = created.find((t: any) => t.suffix === 'dummy');
    expect(dummy).toBeDefined();
    expect(dummy.columnsSql).toContain('name');
  });

  it('registers a menu item pointing to /admin/test-dock', () => {
    const items = (api as any)._internal.menuItems;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const item = items.find((m: any) => m.path === '/admin/test-dock');
    expect(item).toBeDefined();
    expect(item.label).toBeDefined();
  });

  it('registers a slot into dashboard.widgets', () => {
    const slots = (api as any)._internal.registeredSlots;
    const widget = slots.find((s: any) => s.slot === UISlots.DASHBOARD_WIDGETS);
    expect(widget).toBeDefined();
    expect(widget.key).toContain('test-dock');
  });

  it('registers a GET route', () => {
    const routes = (api as any)._internal.routes;
    const testDockRoute = routes.find((r: any) => r.path === '/api/test-dock');
    expect(testDockRoute).toBeDefined();
  });

  it('logs info that plugin is ready', () => {
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('ready'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('UISlots catalogue', () => {
  it("DASHBOARD_WIDGETS equals 'dashboard.widgets'", () => {
    expect(UISlots.DASHBOARD_WIDGETS).toBe('dashboard.widgets');
  });

  it("NAV_MAIN equals 'nav.main'", () => {
    expect(UISlots.NAV_MAIN).toBe('nav.main');
  });

  it('all slot values are non-empty strings', () => {
    for (const [, v] of Object.entries(UISlots)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });
});
