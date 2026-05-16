/**
 * @packageDocumentation
 * Re-exports from the canonical server/lib/hooks.ts implementation.
 * This shim exists for external plugin authors who import from @sinaicamps/shared.
 * During Phase 3 monorepo restructure, the canonical source will move here.
 */

// NOTE: External plugin authors importing from this package path should use:
//   import { hookManager, Hooks } from '@sinaicamps/shared/hooks';
// The actual implementation lives in server/lib/hooks.ts until Phase 3.

export type HookHandler<T = any> = (data: T, context: HookContext) => Promise<T>;

export interface HookContext {
  propertyId?: string;
  userId?: string;
  [key: string]: any;
}

// Canonical runtime implementation: server/lib/hooks.ts
// Phase 3 restructure will move the implementation here.
