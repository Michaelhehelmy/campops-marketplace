import { AsyncLocalStorage } from 'async_hooks';
import type { ThemeManifest } from './ThemeLoader';

export interface RequestContextData {
  /** Resolved site (property) ID for this request. */
  siteId: string;
  /** Resolved property slug. */
  siteSlug: string | null;
  /** The site's current plan (basic | premium | ultimate). */
  plan: string;
  /** Active theme manifest, or null if none configured. */
  theme: ThemeManifest | null;
  /** Plugin names that are enabled for this site. */
  activePlugins: string[];
  /** All autoload options, loaded once per request. */
  autoloadOptions: Map<string, string | null>;
  /** Whether the request arrived on the main marketplace domain. */
  isMainDomain: boolean;
}

const storage = new AsyncLocalStorage<RequestContextData>();

/**
 * RequestContext — per-request scoping via AsyncLocalStorage.
 *
 * Usage:
 *   await RequestContext.run(contextData, async () => {
 *     // anywhere inside: RequestContext.current()
 *   });
 */
export const RequestContext = {
  /**
   * Execute a callback inside a new request context.
   * All async work spawned inside the callback shares this context.
   */
  run<T>(data: RequestContextData, fn: () => Promise<T>): Promise<T> {
    return storage.run(data, fn);
  },

  /**
   * Returns the current request context, or null if called outside a run() scope.
   * Prefer getContext() (src/lib/getContext.ts) for routes that must have a context.
   */
  current(): RequestContextData | null {
    return storage.getStore() ?? null;
  },
};
