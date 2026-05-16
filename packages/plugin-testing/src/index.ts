import { PluginAPI, PluginDatabaseAPI, ScopedRepository } from '@campops/plugin-sdk';
import Database from 'better-sqlite3';

/**
 * Creates a fresh in-memory SQLite database for testing.
 */
export function createTestDb() {
  const db = new Database(':memory:');

  // Helper to execute SQL
  const execute = (sql: string, params: any[] = []) => {
    return db.prepare(sql).run(...params);
  };

  // Helper to query all
  const query = (sql: string, params: any[] = []) => {
    return db.prepare(sql).all(...params);
  };

  // Helper to query one
  const queryOne = (sql: string, params: any[] = []) => {
    return db.prepare(sql).get(...params);
  };

  return { db, execute, query, queryOne };
}

/**
 * Creates a mock PluginAPI for unit testing plugins in isolation.
 */
export function createMockPluginAPI(
  pluginId: string,
  options: { db?: any; config?: any } = {}
): PluginAPI {
  const testDb = options.db || createTestDb();
  const hooks = new Map<string, any[]>();
  const subscribers = new Map<string, Set<(data: any) => void>>();

  const makeMockRepo = (tableName: string): ScopedRepository<any> => ({
    findMany: async () => testDb.query(`SELECT * FROM ${tableName}`),
    findById: async (id) => testDb.queryOne(`SELECT * FROM ${tableName} WHERE id = ?`, [id]),
    create: async (d) => {
      const keys = Object.keys(d);
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
      testDb.execute(sql, Object.values(d));
      return d;
    },
    update: async (id, d) => d,
    delete: async (id) => {
      testDb.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    },
  });

  return {
    pluginId,
    version: '1.0.0',
    logger: {
      info: (...args) => console.log(`[${pluginId}]`, ...args),
      warn: (...args) => console.warn(`[${pluginId}]`, ...args),
      error: (...args) => console.error(`[${pluginId}]`, ...args),
      debug: (...args) => console.debug(`[${pluginId}]`, ...args),
    },
    registerHook: (name, handler) => {
      if (!hooks.has(name)) hooks.set(name, []);
      hooks.get(name)!.push(handler);
      return () => {
        const h = hooks.get(name);
        if (h)
          hooks.set(
            name,
            h.filter((x) => x !== handler)
          );
      };
    },
    executeHook: async (name, data) => {
      let result = data;
      for (const handler of hooks.get(name) || []) {
        result = await handler(result);
      }
      return result;
    },
    hooks: {
      register: (name, handler) => {
        if (!hooks.has(name)) hooks.set(name, []);
        hooks.get(name)!.push(handler);
        return () => {
          const h = hooks.get(name);
          if (h)
            hooks.set(
              name,
              h.filter((x) => x !== handler)
            );
        };
      },
      registerHook: (name, handler) => {
        if (!hooks.has(name)) hooks.set(name, []);
        hooks.get(name)!.push(handler);
        return () => {
          const h = hooks.get(name);
          if (h)
            hooks.set(
              name,
              h.filter((x) => x !== handler)
            );
        };
      },
      execute: async (name, data) => {
        let result = data;
        for (const handler of hooks.get(name) || []) {
          result = await handler(result);
        }
        return result;
      },
      executeHook: async (name, data) => {
        let result = data;
        for (const handler of hooks.get(name) || []) {
          result = await handler(result);
        }
        return result;
      },
    },
    db: {
      rooms: makeMockRepo('rooms'),
      reservations: makeMockRepo('reservations'),
      guests: makeMockRepo('guests'),
      folios: makeMockRepo('folios'),
      roomTypes: makeMockRepo('room_types'),
      query: async (sql: string, p: any[] = []) => testDb.query(sql, p),
      queryOne: async (sql: string, p: any[] = []) => testDb.queryOne(sql, p),
      execute: async (sql: string, p: any[] = []) => {
        testDb.execute(sql, p);
      },
      createTable: async (name: string, sql: string) => {
        testDb.execute(`CREATE TABLE IF NOT EXISTS ${name} (${sql})`);
      },
      dropTable: async (name: string) => {
        testDb.execute(`DROP TABLE IF EXISTS ${name}`);
      },
      tableExists: async (name: string) =>
        !!testDb.queryOne(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [name]),
    } as any,
    services: {
      payment: {
        initiatePayment: async () => ({ paymentUrl: 'https://checkout.stripe.com/test' }),
      },
      tax: { calculateTaxes: async () => ({ taxes: [], totalTax: 0 }) },
      notification: { send: async () => {} },
      i18n: { t: (k: string) => k },
    },
    config: options.config || {},
    publish: (event, data) => {
      subscribers.get(event)?.forEach((cb) => cb(data));
    },
    subscribe: (event, callback) => {
      if (!subscribers.has(event)) subscribers.set(event, new Set());
      subscribers.get(event)!.add(callback);
      return () => subscribers.get(event)?.delete(callback);
    },
    events: {
      emit: (event: string, data: any) => {
        subscribers.get(event)?.forEach((cb) => cb(data));
      },
    },
    plugins: { get: () => null },
    registerRoute: () => {},
    auth: {
      getSession: async () => null,
    },
    ui: {
      registerSlot: () => {},
      addSlotComponent: () => {},
      registerMenuItem: () => {},
      addMenuItem: () => {},
      registerDashboardWidget: () => {},
      addDashboardWidget: () => {},
      registerSettingsPage: () => {},
      addSettingsPage: () => {},
    },
  };
}

/**
 * Validates a plugin manifest object.
 */
export function validateManifest(manifest: any) {
  const required = ['id', 'name', 'version', 'entryPoint'];
  for (const field of required) {
    if (!manifest[field]) throw new Error(`Missing required field: ${field}`);
  }
  return true;
}
