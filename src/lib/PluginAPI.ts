import { db } from './db';
import { pluginRouteRegistry } from './PluginRouteRegistry';
import {
  PluginAPI,
  PluginDatabaseAPI,
  ScopedRepository,
  HookHandler,
  HookContext,
  Logger,
  PluginCapability,
} from '../../packages/plugin-sdk/src/types';
import { hookManager, doAction, Hooks } from './hooks';
import { RequestContext } from './RequestContext';
import { getAuthSession } from './auth';
import { Logger as StructuredLogger } from './logger';
import { UIRegistryService } from './UIRegistryService';
import { PluginBroker } from './PluginBroker';
import { EmailService } from './email';
import { errorResponse } from './errors';

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
 * Guards a capability — throws when the plugin has an explicit capabilities
 * array that does NOT include the required capability.
 * When capabilities is undefined (omitted), all capabilities are allowed.
 */
function requireCapability(
  pluginId: string,
  capability: PluginCapability,
  declared?: PluginCapability[]
): void {
  if (declared !== undefined && !declared.includes(capability)) {
    throw new Error(
      `Plugin "${pluginId}" requires the "${capability}" capability but did not declare it in its manifest`
    );
  }
}

/**
 * Creates the PluginAPI implementation for a specific plugin instance.
 */
export function makePluginAPI(
  pluginId: string,
  propertyId?: string,
  capabilities?: PluginCapability[]
): PluginAPI {
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
      requireCapability(pluginId, 'database', capabilities);
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const fullName = tableName.startsWith(prefix) ? tableName : `${prefix}${tableName}`;
      return makeScopedRepository<T>(fullName, propertyId);
    },

    async query(sql: string, params: any[] = []): Promise<any[]> {
      requireCapability(pluginId, 'database', capabilities);
      return db.query(sql, params);
    },

    async queryOne(sql: string, params: any[] = []): Promise<any> {
      requireCapability(pluginId, 'database', capabilities);
      return db.queryOne(sql, params);
    },

    async execute(sql: string, params: any[] = []): Promise<void> {
      requireCapability(pluginId, 'database', capabilities);
      await db.execute(sql, params);
    },

    async createTable(tableSuffix: string, columnsSql: string): Promise<void> {
      requireCapability(pluginId, 'database', capabilities);
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      await db.createTable(tableName, columnsSql);
    },

    async dropTable(tableSuffix: string): Promise<void> {
      requireCapability(pluginId, 'database', capabilities);
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      await db.dropTable(tableName);
    },

    async tableExists(tableSuffix: string): Promise<boolean> {
      requireCapability(pluginId, 'database', capabilities);
      const prefix = `plugin_${pluginId.replace(/-/g, '_')}_`;
      const tableName = tableSuffix.startsWith(prefix) ? tableSuffix : `${prefix}${tableSuffix}`;
      return db.tableExists(tableName);
    },

    async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T | null> {
      requireCapability(pluginId, 'database', capabilities);
      return db.transaction(async (rawTx) => {
        const txApi: any = {
          ...dbApi,
          query: (sql: string, params: any[] = []) => rawTx.query(sql, params),
          queryOne: (sql: string, params: any[] = []) => rawTx.queryOne(sql, params),
          execute: (sql: string, params: any[] = []) => rawTx.execute(sql, params),
        };
        return callback(txApi);
      });
    },
  };

  return {
    pluginId,
    version: '1.0.0', // This should come from manifest
    logger,

    errorResponse(err: unknown) {
      return errorResponse(err);
    },

    validate(schema: { parse: (data: any) => any }, body: any) {
      return schema.parse(body);
    },

    async checkIdempotency(key: string) {
      const existing = await db.queryOne('SELECT response FROM idempotency_keys WHERE key = ?', [
        key,
      ]);
      if (existing) {
        return JSON.parse(existing.response);
      }
      return null;
    },

    async storeIdempotency(key: string, response: object) {
      await db.execute(
        'INSERT INTO idempotency_keys (key, response, created_at) VALUES (?, ?, ?)',
        [key, JSON.stringify(response), Math.floor(Date.now() / 1000)]
      );
    },

    registerHook<T>(name: string, handler: HookHandler<T>, priority?: number) {
      requireCapability(pluginId, 'hooks', capabilities);
      return hookManager.register(name, handler as any, { priority });
    },

    async executeHook<T>(name: string, data: T, context?: HookContext) {
      requireCapability(pluginId, 'hooks', capabilities);
      return hookManager.execute(name, { ...data, ...context, propertyId });
    },

    hooks: {
      register: (name, handler, priority) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.register(name, handler as any, { priority });
      },
      registerHook: (name, handler, priority) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.register(name, handler as any, { priority });
      },
      addAction: (name: string, handler: any, priority?: number) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.register(name, handler, { priority });
      },
      addFilter: (name: string, handler: any, priority?: number) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.register(name, handler, { priority });
      },
      doAction: (name: string, data?: any) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.doAction(name, data);
      },
      applyFilters: <T>(name: string, value: T, context?: any) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.applyFilters(name, value, context);
      },
      execute: (name, data, context) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.execute(name, { ...data, ...context, propertyId });
      },
      executeHook: (name, data, context) => {
        requireCapability(pluginId, 'hooks', capabilities);
        return hookManager.execute(name, { ...data, ...context, propertyId });
      },
    },

    db: dbApi,

    services: {
      payment: {
        initiatePayment: async () => {
          requireCapability(pluginId, 'payment', capabilities);
          return { paymentUrl: process.env.PAYMENT_URL || 'https://mock-payment.com' };
        },
      },
      tax: {
        calculateTaxes: async (amount) => ({ taxes: [], totalTax: 0 }),
      },
      notification: {
        send: async (opts) => {
          requireCapability(pluginId, 'notification', capabilities);
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
      requireCapability(pluginId, 'events', capabilities);
      pluginLogger.info(`[PubSub] ${channel}:`, message);
    },

    subscribe: (channel, handler) => {
      requireCapability(pluginId, 'events', capabilities);
      return () => {};
    },

    events: {
      emit: (event, data) => {
        requireCapability(pluginId, 'events', capabilities);
        pluginLogger.info(`[Event] ${event}:`, data);
      },
    },

    plugins: {
      get: (name) => PluginBroker.get(name),
    },

    auth: {
      getSession: (req: Request) => {
        requireCapability(pluginId, 'auth', capabilities);
        return getAuthSession(req);
      },
    },

    registerRoute: (path, handler) => {
      requireCapability(pluginId, 'routes', capabilities);
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

    requestContext: () => RequestContext.current(),

    registerPostType: async (definition: {
      name: string;
      label: string;
      labelPlural: string;
      icon?: string;
      supports?: string[];
    }) => {
      const ctx = RequestContext.current();
      const siteId = ctx?.siteId ?? propertyId ?? 'unknown';
      await doAction(Hooks.CORE_POST_TYPE_REGISTERED, { siteId, pluginId, postType: definition });
      pluginLogger.info(`[registerPostType] Registered post type: ${definition.name}`);
    },

    ui: {
      registerSlot: (slot, component) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerSlot(pluginId, slot, component, propertyId);
      },
      addSlotComponent: (slot, component) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerSlot(pluginId, slot, component, propertyId);
      },
      registerMenuItem: (item) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerMenuItem(pluginId, item, propertyId);
      },
      addMenuItem: (item) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerMenuItem(pluginId, item, propertyId);
      },
      registerDashboardWidget: (widget) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerDashboardWidget(pluginId, widget, propertyId);
      },
      addDashboardWidget: (widget) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerDashboardWidget(pluginId, widget, propertyId);
      },
      registerSettingsPage: (page) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerSettingsPage(pluginId, page, propertyId);
      },
      addSettingsPage: (page) => {
        requireCapability(pluginId, 'ui', capabilities);
        UIRegistryService.registerSettingsPage(pluginId, page, propertyId);
      },
    },
  };
}
