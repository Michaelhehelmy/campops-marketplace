import { db } from './db';
import { pluginRouteRegistry } from './PluginRouteRegistry';
import {
  PluginAPI,
  PluginDatabaseAPI,
  ScopedRepository,
  HookHandler,
  HookContext,
  Logger,
} from '../../packages/plugin-sdk/src/types';
import { hookManager } from './hooks';
import { getAuthSession } from './auth';
import { Logger as StructuredLogger } from './logger';
import { UIRegistryService } from './UIRegistryService';
import { PluginBroker } from './PluginBroker';
import { EmailService } from './email';

/**
 * Creates a property-scoped repository for a specific table.
 */
function makeScopedRepository<T>(tableName: string, propertyId?: string): ScopedRepository<T> {
  return {
    async findMany(query: Partial<T> = {}): Promise<T[]> {
      const keys = Object.keys(query);
      let sql = `SELECT * FROM ${tableName} WHERE 1=1`;
      const params: any[] = [];

      if (propertyId) {
        sql += ` AND property_id = ?`;
        params.push(propertyId);
      }

      keys.forEach((key) => {
        sql += ` AND ${key} = ?`;
        params.push((query as any)[key]);
      });

      return db.query(sql, params);
    },

    async findById(id: string): Promise<T | null> {
      let sql = `SELECT * FROM ${tableName} WHERE id = ?`;
      const params: any[] = [id];

      if (propertyId) {
        sql += ` AND property_id = ?`;
        params.push(propertyId);
      }

      return db.queryOne(sql, params);
    },

    async create(data: any): Promise<T> {
      const keys = Object.keys(data);
      const columns = propertyId ? ['property_id', ...keys] : keys;
      const values = propertyId ? [propertyId, ...Object.values(data)] : Object.values(data);
      const placeholders = values.map(() => `?`).join(', ');

      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;

      return db.queryOne(sql, values);
    },

    async update(id: string, data: any): Promise<T> {
      const keys = Object.keys(data);
      const assignments = keys.map((key) => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];

      let sql = `UPDATE ${tableName} SET ${assignments} WHERE id = ?`;
      if (propertyId) {
        sql += ` AND property_id = ?`;
        values.push(propertyId);
      }
      sql += ' RETURNING *';

      return db.queryOne(sql, values);
    },

    async delete(id: string): Promise<void> {
      let sql = `DELETE FROM ${tableName} WHERE id = ?`;
      const params: any[] = [id];
      if (propertyId) {
        sql += ` AND property_id = ?`;
        params.push(propertyId);
      }
      await db.execute(sql, params);
    },
  };
}

/**
 * Creates the PluginAPI implementation for a specific plugin instance.
 */
export function makePluginAPI(pluginId: string, propertyId?: string): PluginAPI {
  const pluginLogger = new StructuredLogger(`plugin:${pluginId}`);
  const logger: Logger = {
    info: (msg, ...args) => pluginLogger.info(msg, ...args),
    warn: (msg, ...args) => pluginLogger.warn(msg, ...args),
    error: (msg, ...args) => pluginLogger.error(msg, ...args),
    debug: (msg, ...args) => pluginLogger.debug(msg, ...args),
  };

  const dbApi: PluginDatabaseAPI = {
    /**
     * getTable — returns a scoped repository for any plugin-owned table.
     * Plugins should prefer this over the removed shortcut repos (rooms,
     * reservations, etc.) that used to hard-code hospitality domain names.
     *
     * Usage:  const bookings = api.db.getTable('bookings');
     */
    getTable<T = Record<string, any>>(tableName: string): ScopedRepository<T> {
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const fullName = tableName.startsWith(prefix) ? tableName : `${prefix}${tableName}`;
      return makeScopedRepository<T>(fullName, propertyId);
    },

    async query(sql: string, params: any[] = []): Promise<any[]> {
      return db.query(sql, params);
    },

    async queryOne(sql: string, params: any[] = []): Promise<any> {
      return db.queryOne(sql, params);
    },

    async execute(sql: string, params: any[] = []): Promise<void> {
      await db.execute(sql, params);
    },

    async createTable(tableSuffix: string, columnsSql: string): Promise<void> {
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      await db.createTable(tableName, columnsSql);
    },

    async dropTable(tableSuffix: string): Promise<void> {
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      await db.dropTable(tableName);
    },

    async tableExists(tableSuffix: string): Promise<boolean> {
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      return db.tableExists(tableName);
    },
  };

  return {
    pluginId,
    version: '1.0.0', // This should come from manifest
    logger,

    registerHook<T>(name: string, handler: HookHandler<T>, priority?: number) {
      return hookManager.register(name, handler as any, { priority });
    },

    async executeHook<T>(name: string, data: T, context?: HookContext) {
      return hookManager.execute(name, { ...data, ...context, propertyId });
    },

    hooks: {
      register: (name, handler, priority) =>
        hookManager.register(name, handler as any, { priority }),
      registerHook: (name, handler, priority) =>
        hookManager.register(name, handler as any, { priority }),
      execute: (name, data, context) =>
        hookManager.execute(name, { ...data, ...context, propertyId }),
      executeHook: (name, data, context) =>
        hookManager.execute(name, { ...data, ...context, propertyId }),
    },

    db: dbApi,

    services: {
      payment: {
        initiatePayment: async () => ({ paymentUrl: 'https://mock-payment.com' }),
      },
      tax: {
        calculateTaxes: async (amount) => ({ taxes: [], totalTax: 0 }),
      },
      notification: {
        send: async (opts) => {
          if (opts.to && opts.subject && opts.body) {
            await EmailService.send({
              to: opts.to,
              subject: opts.subject,
              html: opts.body,
            });
          } else {
            pluginLogger.info('[notification] send called with:', opts);
          }
        },
      },
      i18n: {
        t: (key) => key,
      },
    },

    config: {}, // Should be populated from property_plugins.config

    publish: (channel, message) => {
      pluginLogger.info(`[PubSub] ${channel}:`, message);
    },

    subscribe: (channel, handler) => {
      return () => {};
    },

    events: {
      emit: (event, data) => {
        pluginLogger.info(`[Event] ${event}:`, data);
      },
    },

    plugins: {
      get: (name) => PluginBroker.get(name),
    },

    auth: {
      getSession: (req: Request) => getAuthSession(req),
    },

    registerRoute: (path, handler) => {
      pluginLogger.info(`Registered route: ${path}`);
      // Extract method from handler if it's an object with methods
      if (typeof handler === 'object' && handler !== null) {
        // Handler is a router-like object with methods
        const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;
        for (const method of methods) {
          if (typeof (handler as any)[method] === 'function') {
            pluginRouteRegistry.register(
              pluginId,
              path,
              method,
              (handler as any)[method].bind(handler)
            );
          }
        }
      } else if (typeof handler === 'function') {
        // Handler is a single function, default to POST
        pluginRouteRegistry.register(pluginId, path, 'POST', handler);
      }
    },

    ui: {
      registerSlot: (slot, component) => {
        UIRegistryService.registerSlot(pluginId, slot, component, propertyId);
      },
      addSlotComponent: (slot, component) => {
        UIRegistryService.registerSlot(pluginId, slot, component, propertyId);
      },
      registerMenuItem: (item) => {
        UIRegistryService.registerMenuItem(pluginId, item, propertyId);
      },
      addMenuItem: (item) => {
        UIRegistryService.registerMenuItem(pluginId, item, propertyId);
      },
      registerDashboardWidget: (widget) => {
        UIRegistryService.registerDashboardWidget(pluginId, widget, propertyId);
      },
      addDashboardWidget: (widget) => {
        UIRegistryService.registerDashboardWidget(pluginId, widget, propertyId);
      },
      registerSettingsPage: (page) => {
        UIRegistryService.registerSettingsPage(pluginId, page, propertyId);
      },
      addSettingsPage: (page) => {
        UIRegistryService.registerSettingsPage(pluginId, page, propertyId);
      },
    },
  };
}
