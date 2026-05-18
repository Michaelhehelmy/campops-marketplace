import { PluginEngine } from 'plugin-engine';

/**
 * Registry for ecosystem hooks.
 * Allows plugins to register handlers for specific events and execute them in sequence.
 *
 * This system is dynamic: any string can be a hook name.
 * Constants are provided for core events for convenience.
 */
export const Hooks = {
  // ── Generic / framework hooks (use these in new plugins) ──────────────────
  PAYMENT_ON_SUCCESS: 'payment:success',
  PRICING_CALCULATE: 'pricing:calculate',
  NOTIFICATION_SEND: 'notification:send',
  /** Generic: any entity/user departure event (e.g. guest checkout, user logout). */
  ENTITY_DEPARTED: 'entity:departed',
  /** Generic: a resource detail page was loaded. */
  RESOURCE_PAGE_LOAD: 'resource:page_load',
  /** Generic: a new transaction/order/booking was created. */
  TRANSACTION_CREATED: 'transaction:created',

  // ── Core lifecycle actions (Phase 3) ──────────────────────────────────────
  /** Fired once per request after site is resolved. Payload: { siteId, plan }. */
  CORE_REQUEST_BOOTSTRAP: 'core:request:bootstrap',
  /** Fired after site row is loaded. Payload: site object. */
  CORE_SITE_RESOLVED: 'core:site:resolved',
  /** Filter: fired before a post is saved. Can modify the post input. */
  CORE_POST_BEFORE_SAVE: 'core:post:before_save',
  /** Action: fired after a post is saved. Payload: Post. */
  CORE_POST_AFTER_SAVE: 'core:post:after_save',
  /** Action: fired before a post is deleted. Payload: { id, siteId }. */
  CORE_POST_BEFORE_DELETE: 'core:post:before_delete',
  /** Filter: applied when an option is read. Can modify the returned value. */
  CORE_OPTION_GET: 'core:option:get',
  /** Action: fired when an option is written. Payload: { siteId, name, value }. */
  CORE_OPTION_SET: 'core:option:set',
  /** Action: fired after a theme is loaded for a site. Payload: { siteId, themeId }. */
  CORE_THEME_LOADED: 'core:theme:loaded',
  /** Action: fired when a plugin registers a post type. Payload: { siteId, pluginId, postType }. */
  CORE_POST_TYPE_REGISTERED: 'core:post_type:registered',
  /** Action: fired after a plugin is activated for a site. Payload: { siteId, pluginId, version }. */
  CORE_PLUGIN_ACTIVATED: 'core:plugin:activated',
  /** Action: fired after a plugin is deactivated for a site. Payload: { siteId, pluginId }. */
  CORE_PLUGIN_DEACTIVATED: 'core:plugin:deactivated',
  /** Filter: fired when building the PWA manifest for a site. Payload: manifest object. */
  CORE_MANIFEST_BUILD: 'core:manifest:build',
  /** Action: fired after a site's plan is upgraded. Payload: { siteId, previousPlan, newPlan }. */
  CORE_SITE_PLAN_UPGRADED: 'core:site:plan_upgraded',

  // ── Backward-compat aliases (deprecated — will be removed in v3) ──────────
  /** @deprecated Use ENTITY_DEPARTED */
  GUEST_CHECKED_OUT: 'entity:departed',
  /** @deprecated Use RESOURCE_PAGE_LOAD */
  LISTING_PAGE_LOAD: 'resource:page_load',
  /** @deprecated Use TRANSACTION_CREATED */
  BOOKING_CREATED: 'transaction:created',
} as const;

export type HookHandler = (data: any) => any | Promise<any>;

class HookManager {
  private engine = new PluginEngine<any>();
  private handlerMap = new Map<string, { handler: HookHandler; unsubscribe: () => void }[]>();
  private registrationCount = 0;

  /**
   * Register a handler for a specific hook.
   * @param name The name of the hook (any string)
   * @param handler The function to execute
   * @param options Optional configuration (priority, etc.)
   * @returns An unregister function
   */
  register(name: string, handler: HookHandler, options: { priority?: number } = {}) {
    const registrationId = `reg-${++this.registrationCount}`;

    const unsubscribe = this.engine.on(name, {
      name: registrationId,
      enter: async (data: any) => {
        return handler(data);
      },
    });

    const entry = { handler, unsubscribe };
    if (!this.handlerMap.has(name)) {
      this.handlerMap.set(name, []);
    }
    this.handlerMap.get(name)!.push(entry);

    return () => {
      unsubscribe();
      const handlers = this.handlerMap.get(name);
      if (handlers) {
        const index = handlers.findIndex((e) => e.handler === handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Execute all handlers for a hook in sequence (pipeline).
   * @param name The name of the hook
   * @param data Initial data
   * @returns Final data after all handlers have executed
   * @deprecated Prefer doAction() or applyFilters()
   */
  async execute(name: string, data: any) {
    return this.engine.exec(name, data);
  }

  /**
   * Fire an action hook — runs all registered handlers but discards return values.
   * Use this when notifying listeners of an event without expecting them to transform data.
   */
  async doAction(name: string, data?: any): Promise<void> {
    if (!this.hasRegistrations(name)) return;
    await this.engine.exec(name, data);
  }

  /**
   * Apply a filter hook — passes value through each registered handler in sequence.
   * Each handler receives the (possibly modified) output of the previous handler.
   * Returns the final transformed value.
   */
  async applyFilters<T>(name: string, value: T, context?: any): Promise<T> {
    if (!this.hasRegistrations(name)) return value;
    const result = await this.engine.exec(name, { value, context });
    return (result as any)?.value ?? result ?? value;
  }

  /**
   * Check if there are any registrations for a hook.
   * @param name The hook name
   */
  hasRegistrations(name: string): boolean {
    return (this.handlerMap.get(name)?.length ?? 0) > 0;
  }

  /**
   * Get all registered handlers for a hook.
   * @param name The hook name
   */
  getHandlers(name: string): HookHandler[] {
    return (this.handlerMap.get(name) ?? []).map((e) => e.handler);
  }

  /**
   * Clear registrations.
   * @param name Optional hook name to clear. If omitted, clears all hooks.
   */
  clear(name?: string) {
    if (name) {
      const handlers = this.handlerMap.get(name);
      if (handlers) {
        handlers.forEach((e) => e.unsubscribe());
        this.handlerMap.delete(name);
      }
    } else {
      // Complete reset
      this.handlerMap.forEach((handlers) => handlers.forEach((e) => e.unsubscribe()));
      this.handlerMap.clear();
      this.engine = new PluginEngine<any>();
    }
  }
}

export const hookManager = new HookManager();

// ── WordPress-style API (Phase 3) ─────────────────────────────────────────
/** Register a handler for an action hook (fire-and-forget). */
export const addAction = (name: string, handler: HookHandler, priority?: number) =>
  hookManager.register(name, handler, { priority });

/** Register a handler for a filter hook (transforms value). */
export const addFilter = (name: string, handler: HookHandler, priority?: number) =>
  hookManager.register(name, handler, { priority });

/** Fire an action — runs all handlers, discards return values. */
export const doAction = (name: string, data?: any) => hookManager.doAction(name, data);

/** Apply a filter — passes value through all handlers in sequence. */
export const applyFilters = <T>(name: string, value: T, context?: any) =>
  hookManager.applyFilters(name, value, context);

// ── Backward compatibility exports ────────────────────────────────────────
export const registerHook = (name: string, handler: HookHandler) =>
  hookManager.register(name, handler);
export const executeHook = (name: string, data: any) => hookManager.execute(name, data);
