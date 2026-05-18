import Database from 'better-sqlite3';

export interface PostMeta {
  [key: string]: string | null;
}

export interface Post {
  id: string;
  siteId: string;
  postType: string;
  postStatus: string;
  postSlug: string | null;
  postTitle: string;
  postContent: string | null;
  authorId: string | null;
  parentId: string | null;
  menuOrder: number;
  createdAt: number | null;
  updatedAt: number | null;
  meta: PostMeta;
}

export interface MetaFilter {
  key: string;
  value: string;
  compare?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE';
}

export interface PostQueryArgs {
  siteId: string;
  postType?: string | string[];
  status?: string | string[];
  postSlug?: string;
  authorId?: string;
  parentId?: string | null;
  meta?: MetaFilter[];
  search?: string;
  orderBy?: 'created_at' | 'updated_at' | 'menu_order' | 'post_title';
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  includeMeta?: boolean;
}

/**
 * PostQuery — thin SQL query builder over the posts + postmeta tables.
 * Always scopes by site_id. Returns typed Post objects with a meta map.
 */
export class PostQuery {
  constructor(private readonly db: Database.Database) {}

  query(args: PostQueryArgs): Post[] {
    const {
      siteId,
      postType,
      status,
      postSlug,
      authorId,
      parentId,
      meta = [],
      search,
      orderBy = 'created_at',
      order = 'DESC',
      limit = 100,
      offset = 0,
      includeMeta = true,
    } = args;

    const conditions: string[] = ['p.site_id = ?'];
    const params: (string | number | null)[] = [siteId];

    if (postType !== undefined) {
      const types = Array.isArray(postType) ? postType : [postType];
      conditions.push(`p.post_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }

    if (status !== undefined) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`p.post_status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }

    if (postSlug !== undefined) {
      conditions.push('p.post_slug = ?');
      params.push(postSlug);
    }

    if (authorId !== undefined) {
      conditions.push('p.author_id = ?');
      params.push(authorId);
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push('p.parent_id IS NULL');
      } else {
        conditions.push('p.parent_id = ?');
        params.push(parentId);
      }
    }

    if (search) {
      conditions.push('(p.post_title LIKE ? OR p.post_content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    for (const f of meta) {
      const compare = f.compare ?? '=';
      conditions.push(
        `EXISTS (SELECT 1 FROM postmeta m WHERE m.post_id = p.id AND m.meta_key = ? AND m.meta_value ${compare} ?)`
      );
      params.push(f.key, f.value);
    }

    const allowedOrderBy: Record<string, string> = {
      created_at: 'p.created_at',
      updated_at: 'p.updated_at',
      menu_order: 'p.menu_order',
      post_title: 'p.post_title',
    };
    const safeOrderBy = allowedOrderBy[orderBy] ?? 'p.created_at';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT
        p.id, p.site_id, p.post_type, p.post_status, p.post_slug,
        p.post_title, p.post_content, p.author_id, p.parent_id,
        p.menu_order, p.created_at, p.updated_at
      FROM posts p
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${safeOrderBy} ${safeOrder}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      site_id: string;
      post_type: string;
      post_status: string;
      post_slug: string | null;
      post_title: string;
      post_content: string | null;
      author_id: string | null;
      parent_id: string | null;
      menu_order: number;
      created_at: number | null;
      updated_at: number | null;
    }>;

    if (!includeMeta || rows.length === 0) {
      return rows.map((r) => this.mapRow(r, {}));
    }

    const ids = rows.map((r) => r.id);
    const metaRows = this.db
      .prepare(
        `SELECT post_id, meta_key, meta_value FROM postmeta WHERE post_id IN (${ids.map(() => '?').join(',')})`
      )
      .all(...ids) as Array<{ post_id: string; meta_key: string; meta_value: string | null }>;

    const metaByPost: Record<string, PostMeta> = {};
    for (const m of metaRows) {
      if (!metaByPost[m.post_id]) metaByPost[m.post_id] = {};
      metaByPost[m.post_id][m.meta_key] = m.meta_value;
    }

    return rows.map((r) => this.mapRow(r, metaByPost[r.id] ?? {}));
  }

  queryOne(args: PostQueryArgs): Post | null {
    const results = this.query({ ...args, limit: 1 });
    return results[0] ?? null;
  }

  count(
    args: Omit<PostQueryArgs, 'orderBy' | 'order' | 'limit' | 'offset' | 'includeMeta'>
  ): number {
    const { siteId, postType, status, postSlug, authorId, parentId, meta = [], search } = args;

    const conditions: string[] = ['p.site_id = ?'];
    const params: (string | number | null)[] = [siteId];

    if (postType !== undefined) {
      const types = Array.isArray(postType) ? postType : [postType];
      conditions.push(`p.post_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }
    if (status !== undefined) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`p.post_status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
    if (postSlug !== undefined) {
      conditions.push('p.post_slug = ?');
      params.push(postSlug);
    }
    if (authorId !== undefined) {
      conditions.push('p.author_id = ?');
      params.push(authorId);
    }
    if (parentId !== undefined) {
      parentId === null
        ? conditions.push('p.parent_id IS NULL')
        : (conditions.push('p.parent_id = ?'), params.push(parentId));
    }
    if (search) {
      conditions.push('(p.post_title LIKE ? OR p.post_content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    for (const f of meta) {
      const compare = f.compare ?? '=';
      conditions.push(
        `EXISTS (SELECT 1 FROM postmeta m WHERE m.post_id = p.id AND m.meta_key = ? AND m.meta_value ${compare} ?)`
      );
      params.push(f.key, f.value);
    }

    const row = this.db
      .prepare(`SELECT COUNT(*) as c FROM posts p WHERE ${conditions.join(' AND ')}`)
      .get(...params) as { c: number };
    return row.c;
  }

  private mapRow(
    r: {
      id: string;
      site_id: string;
      post_type: string;
      post_status: string;
      post_slug: string | null;
      post_title: string;
      post_content: string | null;
      author_id: string | null;
      parent_id: string | null;
      menu_order: number;
      created_at: number | null;
      updated_at: number | null;
    },
    meta: PostMeta
  ): Post {
    return {
      id: r.id,
      siteId: r.site_id,
      postType: r.post_type,
      postStatus: r.post_status,
      postSlug: r.post_slug,
      postTitle: r.post_title,
      postContent: r.post_content,
      authorId: r.author_id,
      parentId: r.parent_id,
      menuOrder: r.menu_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      meta,
    };
  }
}
