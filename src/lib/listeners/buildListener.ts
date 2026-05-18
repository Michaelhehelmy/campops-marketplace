import { addAction, Hooks } from '../hooks';
import { getSqlite } from '../db';
import { logger } from '../logger';

/**
 * buildListener — registers a hook handler on core:site:plan_upgraded.
 *
 * When a site upgrades to the 'ultimate' plan it needs a custom-domain SPA
 * build. This listener inserts a 'pending' row into the build_queue table so
 * that an external worker can pick it up asynchronously.
 *
 * Call registerBuildListener() once at application startup (e.g. in the
 * root layout server component or a bootstrap module).
 */
export function registerBuildListener(): () => void {
  return addAction(Hooks.CORE_SITE_PLAN_UPGRADED, async (payload: unknown) => {
    const { siteId, newPlan, actorId } = (payload ?? {}) as {
      siteId?: string;
      newPlan?: string;
      actorId?: string;
    };

    if (!siteId || newPlan !== 'ultimate') return;

    try {
      const db = getSqlite();
      db.prepare(
        `INSERT INTO build_queue (site_id, status, triggered_by, created_at)
         VALUES (?, 'pending', ?, unixepoch())`
      ).run(siteId, actorId ?? null);

      logger.info(`[BuildListener] Queued build for site ${siteId} after plan upgrade to ultimate`);
    } catch (err: any) {
      logger.error(`[BuildListener] Failed to queue build for site ${siteId}:`, err.message);
    }
  });
}
