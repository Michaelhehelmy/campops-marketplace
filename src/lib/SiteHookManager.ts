import { hookManager, HookHandler } from './hooks';

/**
 * SiteHookManager — a view over the global hookManager scoped to a single site.
 *
 * Handlers registered via SiteHookManager receive an extra `siteId` check:
 * if the event payload includes a `siteId` property that doesn't match this
 * instance's site, the handler is skipped automatically.
 *
 * This lets plugins register site-scoped handlers without worrying about
 * cross-tenant contamination on a single global event bus.
 *
 * Usage:
 *   const hooks = SiteHookManager.forSite('site-uuid-123');
 *   hooks.addAction('core:post:after_save', (post) => { ... });
 *   hooks.doAction('core:post:after_save', post);
 */
export class SiteHookManager {
  private readonly siteId: string;
  private readonly unsubscribers: Array<() => void> = [];

  private constructor(siteId: string) {
    this.siteId = siteId;
  }

  static forSite(siteId: string): SiteHookManager {
    return new SiteHookManager(siteId);
  }

  /**
   * Register a site-scoped action handler.
   * The handler is only invoked when the event payload siteId matches this site.
   */
  addAction(name: string, handler: HookHandler, priority?: number): () => void {
    const scoped: HookHandler = (data: any) => {
      if (data && typeof data === 'object' && 'siteId' in data && data.siteId !== this.siteId) {
        return data;
      }
      return handler(data);
    };

    const unsub = hookManager.register(name, scoped, { priority });
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /**
   * Register a site-scoped filter handler.
   * The handler is only invoked when the event payload siteId matches this site.
   */
  addFilter(name: string, handler: HookHandler, priority?: number): () => void {
    const scoped: HookHandler = (data: any) => {
      if (data && typeof data === 'object' && 'siteId' in data && data.siteId !== this.siteId) {
        return data;
      }
      return handler(data);
    };

    const unsub = hookManager.register(name, scoped, { priority });
    this.unsubscribers.push(unsub);
    return unsub;
  }

  /** Fire an action scoped to this site's handlers. */
  async doAction(name: string, data?: any): Promise<void> {
    await hookManager.doAction(name, { ...(data ?? {}), siteId: this.siteId });
  }

  /** Apply a filter scoped to this site's handlers. */
  async applyFilters<T>(name: string, value: T, context?: any): Promise<T> {
    return hookManager.applyFilters(name, value, { ...(context ?? {}), siteId: this.siteId });
  }

  /** Deregister all handlers registered by this SiteHookManager instance. */
  destroy(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers.length = 0;
  }
}
