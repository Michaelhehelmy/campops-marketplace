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
   */
  async execute(name: string, data: any) {
    return this.engine.exec(name, data);
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

// Backward compatibility exports
export const registerHook = (name: string, handler: HookHandler) =>
  hookManager.register(name, handler);
export const executeHook = (name: string, data: any) => hookManager.execute(name, data);
