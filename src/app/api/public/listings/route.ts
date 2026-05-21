import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { PostQuery, type GlobalPostQueryArgs, type MetaFilter } from '@/lib/PostQuery';
import { applyFilters, Hooks } from '@/lib/hooks';
import { errorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/listings
 *
 * Unified cross-site listings endpoint. All parameters are optional.
 *
 * Query parameters:
 *   type      – post_type filter (default: "listing"); comma-separated for multiple
 *   status    – post_status filter (default: "publish"); comma-separated
 *   search    – full-text search on post_title / post_content
 *   limit     – max results, 1–50 (default: 20)
 *   skip      – offset (default: 0)
 *   orderBy   – created_at | updated_at | menu_order | post_title (default: created_at)
 *   order     – ASC | DESC (default: DESC)
 *   meta[key] – meta filter: ?meta[is_featured]=1  (repeatable for AND conditions)
 *   siteId    – restrict to a single site (optional; no siteId = cross-site)
 *
 * Response:
 *   { listings: Post[], total: number, limit: number, skip: number }
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // --- Parse params ---
  const typeParam = sp.get('type') ?? 'listing';
  const postType = typeParam.includes(',') ? typeParam.split(',').map((s) => s.trim()) : typeParam;

  const statusParam = sp.get('status') ?? 'publish';
  const status = statusParam.includes(',')
    ? statusParam.split(',').map((s) => s.trim())
    : statusParam;

  const search = sp.get('search') ?? undefined;
  const rawLimit = parseInt(sp.get('limit') ?? '20', 10);
  const rawSkip = parseInt(sp.get('skip') ?? '0', 10);

  if (isNaN(rawLimit) || rawLimit < 1 || rawLimit > 50) {
    return NextResponse.json({ error: 'limit must be between 1 and 50' }, { status: 400 });
  }
  if (isNaN(rawSkip) || rawSkip < 0) {
    return NextResponse.json({ error: 'skip must be >= 0' }, { status: 400 });
  }

  const orderByParam = sp.get('orderBy') ?? 'created_at';
  const validOrderBy = ['created_at', 'updated_at', 'menu_order', 'post_title'] as const;
  const orderBy = (
    validOrderBy.includes(orderByParam as any) ? orderByParam : 'created_at'
  ) as GlobalPostQueryArgs['orderBy'];

  const orderParam = (sp.get('order') ?? 'DESC').toUpperCase();
  const order: 'ASC' | 'DESC' = orderParam === 'ASC' ? 'ASC' : 'DESC';

  // Build meta filters from ?meta[key]=value entries
  const meta: MetaFilter[] = [];
  sp.forEach((value, key) => {
    const m = key.match(/^meta\[(.+)\]$/);
    if (m) {
      meta.push({ key: m[1], value });
    }
  });

  // Optional single-site restriction
  const siteId = sp.get('siteId') ?? undefined;

  try {
    const db = getSqlite();
    const q = new PostQuery(db);

    let rawArgs: GlobalPostQueryArgs = {
      postType,
      status,
      search,
      meta,
      orderBy,
      order,
      limit: rawLimit,
      offset: rawSkip,
      includeMeta: true,
    };

    // Allow plugins to modify the query args
    rawArgs = (await applyFilters(
      Hooks.CORE_PUBLIC_LISTINGS_QUERY,
      rawArgs
    )) as GlobalPostQueryArgs;

    let listings, total;

    if (siteId) {
      // Site-scoped path — use regular query for efficiency
      const siteArgs = {
        siteId,
        postType: rawArgs.postType,
        status: rawArgs.status,
        search: rawArgs.search,
        meta: rawArgs.meta,
        orderBy: rawArgs.orderBy,
        order: rawArgs.order,
        limit: rawArgs.limit ?? rawLimit,
        offset: rawArgs.offset ?? rawSkip,
        includeMeta: true,
      };
      [listings, total] = [q.query(siteArgs), q.count(siteArgs)];
    } else {
      // Cross-site path
      [listings, total] = await Promise.all([
        q.globalQuery(rawArgs),
        q.globalCount({
          postType: rawArgs.postType,
          status: rawArgs.status,
          search: rawArgs.search,
          meta: rawArgs.meta,
        }),
      ]);
    }

    return NextResponse.json({
      listings,
      total,
      limit: rawLimit,
      skip: rawSkip,
    });
  } catch (err: any) {
    console.error('[Public Listings API] Error:', err);
    return errorResponse(err);
  }
}
