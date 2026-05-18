import { type NextRequest, NextResponse } from 'next/server';
import { getSqlite } from './db';
import { RequestContext, type RequestContextData } from './RequestContext';
import { SiteBootstrap } from './SiteBootstrap';
import { doAction, Hooks } from './hooks';
import { logger } from './logger';

/**
 * withRequestContext — wraps a Next.js App Router route handler so that
 * RequestContext.current() is populated for the duration of the request.
 *
 * The middleware sets x-site-id, x-site-slug, x-site-plan, and x-main-domain
 * headers. This wrapper reads those headers, bootstraps the context, then
 * delegates to the real handler.
 *
 * Usage (in a route file):
 *   export const GET = withRequestContext(async (req) => { ... });
 */
export function withRequestContext(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const siteId = req.headers.get('x-site-id');

    if (!siteId) {
      return handler(req);
    }

    let ctx: RequestContextData;

    try {
      const db = getSqlite();
      const bootstrap = new SiteBootstrap(db);

      const activePlugins = bootstrap.loadActivePlugins(siteId);
      const autoloadOptions = bootstrap.loadAutoloadOptions(siteId);
      const theme = bootstrap.loadTheme(siteId);

      ctx = {
        siteId,
        siteSlug: req.headers.get('x-site-slug'),
        plan: req.headers.get('x-site-plan') ?? 'basic',
        theme,
        activePlugins,
        autoloadOptions,
        isMainDomain: req.headers.get('x-main-domain') === '1',
      };
    } catch (err: any) {
      logger.warn(
        '[withRequestContext] Failed to bootstrap context, proceeding without:',
        err.message
      );
      return handler(req);
    }

    return RequestContext.run(ctx, async () => {
      await doAction(Hooks.CORE_REQUEST_BOOTSTRAP, { siteId: ctx.siteId, plan: ctx.plan });
      await doAction(Hooks.CORE_SITE_RESOLVED, {
        siteId: ctx.siteId,
        siteSlug: ctx.siteSlug,
        plan: ctx.plan,
      });
      return handler(req);
    });
  };
}
