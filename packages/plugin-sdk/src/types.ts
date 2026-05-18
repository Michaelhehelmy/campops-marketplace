/**
 * SinaiCamps Plugin SDK – Public API surface exposed to all plugins.
 *
 * A plugin is a Node.js module that exports a default function:
 *   export default function init(api: PluginAPI): void | Promise<void>
 *
 * The PluginAPI object is the ONLY thing a plugin should import from the core.
 * Plugins must not import directly from server/* paths.
 */

// These types mirror server/lib/hooks.ts — kept in sync manually until Phase 3 restructure.
export type HookHandler<T = any> = (data: T, context: HookContext) => Promise<T>;
export interface HookContext {
  propertyId?: string;
  userId?: string;
  [key: string]: any;
}

// ─── Scoped Repository ────────────────────────────────────────────────────────

/**
 * A property-scoped database accessor provided to plugins.
 * All queries are automatically filtered by propertyId — plugins cannot
 * accidentally read or write data from another property.
 */
export interface ScopedRepository<T> {
  findMany(query?: Partial<T>): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ─── Service sub-APIs ─────────────────────────────────────────────────────────

export interface PaymentServiceAPI {
  initiatePayment(
    orderId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<{ paymentUrl?: string; transactionId?: string }>;
}

export interface TaxServiceAPI {
  calculateTaxes(
    baseAmount: number,
    propertyId?: string
  ): Promise<{
    taxes: { name: string; rate: number; amount: number }[];
    totalTax: number;
  }>;
}

export interface NotificationServiceAPI {
  send(opts: {
    to: string;
    channel: 'email' | 'sms' | 'whatsapp';
    subject?: string;
    body: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
}

export interface I18nServiceAPI {
  t(key: string, locale?: string, vars?: Record<string, string>): string;
}

// ─── UI injection types ───────────────────────────────────────────────────────

export interface AdminMenuItem {
  label: string;
  icon?: string;
  path: string;
  permission?: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  component: string; // Registered slot name
  width?: 'sm' | 'md' | 'lg' | 'full';
}

export interface SettingsPageDefinition {
  id: string;
  label: string;
  icon?: string;
  component: string; // Registered slot name
}

// ─── Logger ───────────────────────────────────────────────────────────────────

export interface Logger {
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
}

// ─── OTA Adapter (Phase 5 target) ────────────────────────────────────────────

export interface RoomMapping {
  localRoomId: string;
  channelRoomId: string;
}

export interface RateMapping {
  localRatePlanId: string;
  channelRatePlanId: string;
  price: number;
  currency: string;
}

export interface ChannelReservation {
  channelRef: string;
  roomId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  totalAmount: number;
  currency: string;
  source: string;
}

export interface InventorySyncResult {
  updated: number;
  errors: string[];
}

export interface RateSyncResult {
  updated: number;
  errors: string[];
}

export interface OTAAdapter {
  id: string;
  name: string;
  syncInventory(roomMappings: RoomMapping[]): Promise<InventorySyncResult>;
  syncRates(rateMappings: RateMapping[]): Promise<RateSyncResult>;
  fetchReservations(since: Date): Promise<ChannelReservation[]>;
  cancelReservation(channelRef: string): Promise<void>;
}

// ─── Plugin Manifest ──────────────────────────────────────────────────────────

export interface PluginManifestEntry {
  name: string;
  version: string;
  sinaicampsVersion: string; // semver range, e.g. ">=2.0.0"
  path: string; // resolved module path
  config: Record<string, any>; // env vars resolved server-side
  enabled?: boolean; // defaults to true
}

// ─── Plugin Database API ──────────────────────────────────────────────────────

export interface PluginDatabaseAPI {
  /**
   * getTable — generic scoped-repository factory.
   *
   * Returns a property-scoped CRUD repository for any table name.
   * The returned repository automatically prefixes queries with
   * `plugin_<pluginId>_` so plugin tables are isolated.
   *
   * This replaces the removed shortcut properties `rooms`, `reservations`,
   * `guests`, `folios`, and `roomTypes` which encoded hospitality-domain
   * concepts into the core SDK.
   *
   * @example
   *   const bookings = api.db.getTable<Booking>('bookings');
   *   const items    = await bookings.findMany({ status: 'confirmed' });
   */
  getTable<T = Record<string, any>>(tableName: string): ScopedRepository<T>;

  /** Run a SELECT and return all rows. */
  query(sql: string, params?: any[]): Promise<any[]>;
  /** Run a SELECT and return the first matching row. */
  queryOne(sql: string, params?: any[]): Promise<any>;
  /** Run an INSERT / UPDATE / DELETE. */
  execute(sql: string, params?: any[]): Promise<void>;

  /**
   * Create a plugin-namespaced table following the standard convention.
   * Table name: `plugin_<pluginId>_<tableSuffix>`.
   */
  createTable(tableSuffix: string, columnsSql: string): Promise<void>;

  /** Drop the plugin's table (call from uninstall hook). */
  dropTable(tableSuffix: string): Promise<void>;

  /** Returns true when the plugin's table already exists. */
  tableExists(tableSuffix: string): Promise<boolean>;
}

// ─── Plugin API ───────────────────────────────────────────────────────────────

export interface PluginAPI {
  // Identity
  readonly pluginId: string;
  readonly version: string;
  readonly logger: Logger;

  // Hook system — top-level convenience methods
  registerHook<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
  executeHook<T = any>(name: string, data: T, context?: HookContext): Promise<T>;

  // Hook system — namespaced (matches server plugin-dock API shape)
  hooks: {
    register<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
    registerHook<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
    /** Phase 3: WordPress-style action registration (fire-and-forget). */
    addAction(name: string, handler: (data?: any) => void | Promise<void>, priority?: number): () => void;
    /** Phase 3: WordPress-style filter registration (transforms value). */
    addFilter(name: string, handler: (data: any) => any | Promise<any>, priority?: number): () => void;
    /** Phase 3: Fire an action hook (runs handlers, discards return values). */
    doAction(name: string, data?: any): Promise<void>;
    /** Phase 3: Apply a filter hook (passes value through all handlers). */
    applyFilters<T = any>(name: string, value: T, context?: any): Promise<T>;
    execute<T = any>(name: string, data: T, context?: HookContext): Promise<T>;
    executeHook<T = any>(name: string, data: T, context?: HookContext): Promise<T>;
  };

  // Scoped DB access + table lifecycle helpers
  db: PluginDatabaseAPI;

  // Core services
  services: {
    payment: PaymentServiceAPI;
    tax: TaxServiceAPI;
    notification: NotificationServiceAPI;
    i18n: I18nServiceAPI;
  };

  // Plugin-specific configuration (env vars already resolved)
  config: Record<string, any>;

  // Real-time pub/sub (Socket.io channels)
  publish(channel: string, message: any): void;
  subscribe(channel: string, handler: (msg: any) => void): () => void;

  // Events (alias for pub/sub broadcast)
  events: {
    emit(event: string, data: any): void;
  };

  // Access other loaded plugins
  plugins: {
    get(name: string): any;
  };

  // Auth Helper
  auth: {
    getSession(req: Request): Promise<any>;
  };

  // Register a Hono router at the given path
  registerRoute(path: string, router: any): void;

  // UI injection (admin panel slots)
  ui: {
    /** Register a component for a specific slot. Alias for addSlotComponent. */
    registerSlot(slotName: string, componentKey: string): void;
    addSlotComponent(slotName: string, componentKey: string): void;

    /** Add an item to the sidebar navigation. Alias for addMenuItem. */
    registerMenuItem(item: AdminMenuItem): void;
    addMenuItem(item: AdminMenuItem): void;

    /** Add a widget to the property dashboard. Alias for addDashboardWidget. */
    registerDashboardWidget(widget: DashboardWidget): void;
    addDashboardWidget(widget: DashboardWidget): void;

    /** Add a new tab to the settings page. Alias for addSettingsPage. */
    registerSettingsPage(page: SettingsPageDefinition): void;
    addSettingsPage(page: SettingsPageDefinition): void;
  };
}

// ─── Plugin module shape ──────────────────────────────────────────────────────

export type PluginInitFn = (api: PluginAPI) => void | Promise<void>;
