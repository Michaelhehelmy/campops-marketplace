/**
 * SinaiCamps Plugin SDK – Public API surface exposed to all plugins.
 *
 * A plugin is a Node.js module that exports a default function:
 *   export default function init(api: PluginAPI): void | Promise<void>
 *
 * The PluginAPI object is the ONLY thing a plugin should import from the core.
 * Plugins must not import directly from server/* paths.
 */
export type HookHandler<T = any> = (data: T, context: HookContext) => Promise<T>;
export interface HookContext {
  propertyId?: string;
  userId?: string;
  [key: string]: any;
}
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
export interface PaymentServiceAPI {
  initiatePayment(
    orderId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<{
    paymentUrl?: string;
    transactionId?: string;
  }>;
}
export interface TaxServiceAPI {
  calculateTaxes(
    baseAmount: number,
    propertyId?: string
  ): Promise<{
    taxes: {
      name: string;
      rate: number;
      amount: number;
    }[];
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
export interface AdminMenuItem {
  label: string;
  icon?: string;
  path: string;
  permission?: string;
}
export interface DashboardWidget {
  id: string;
  title: string;
  component: string;
  width?: 'sm' | 'md' | 'lg' | 'full';
}
export interface SettingsPageDefinition {
  id: string;
  label: string;
  icon?: string;
  component: string;
}
export interface Logger {
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
}
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
export interface OTAAdapter {
  id: string;
  name: string;
  syncInventory(roomMappings: RoomMapping[]): Promise<void>;
  syncRates(rateMappings: RateMapping[]): Promise<void>;
  fetchReservations(since: Date): Promise<ChannelReservation[]>;
  cancelReservation(channelRef: string): Promise<void>;
}
export interface PluginManifestEntry {
  name: string;
  version: string;
  sinaicampsVersion: string;
  path: string;
  config: Record<string, any>;
  enabled?: boolean;
}
export interface PluginAPI {
  readonly pluginId: string;
  readonly version: string;
  readonly logger: Logger;
  registerHook<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
  executeHook<T = any>(name: string, data: T, context?: HookContext): Promise<T>;
  hooks: {
    register<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
    registerHook<T = any>(name: string, handler: HookHandler<T>, priority?: number): () => void;
    executeHook<T = any>(name: string, data: T, context?: HookContext): Promise<T>;
  };
  db: {
    rooms: ScopedRepository<Record<string, any>>;
    reservations: ScopedRepository<Record<string, any>>;
    guests: ScopedRepository<Record<string, any>>;
    folios: ScopedRepository<Record<string, any>>;
    roomTypes: ScopedRepository<Record<string, any>>;
    query?(sql: string, params?: any[]): Promise<any[]>;
  };
  services: {
    payment: PaymentServiceAPI;
    tax: TaxServiceAPI;
    notification: NotificationServiceAPI;
    i18n: I18nServiceAPI;
  };
  config: Record<string, any>;
  publish(channel: string, message: any): void;
  subscribe(channel: string, handler: (msg: any) => void): () => void;
  events: {
    emit(event: string, data: any): void;
  };
  plugins: {
    get(name: string): any;
  };
  registerRoute(path: string, router: any): void;
  ui: {
    addSlotComponent(slotName: string, componentKey: string): void;
    addMenuItem(item: AdminMenuItem): void;
    addDashboardWidget(widget: DashboardWidget): void;
    addSettingsPage(page: SettingsPageDefinition): void;
    registerSlot?(slotName: string, componentKey: string): void;
    registerMenuItem?(item: {
      id: string;
      label: string;
      icon?: string;
      path: string;
      order?: number;
    }): void;
    registerDashboardWidget?(widget: { id: string; position: string }): void;
    registerSettingsPage?(page: { id: string; label: string; path: string }): void;
  };
}
export type PluginInitFn = (api: PluginAPI) => void | Promise<void>;
//# sourceMappingURL=types.d.ts.map
