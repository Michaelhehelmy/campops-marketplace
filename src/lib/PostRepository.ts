import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { doAction, applyFilters, Hooks } from './hooks';
import type { Post, PostMeta } from './PostQuery';

export interface CreatePostInput {
  siteId: string;
  postType: string;
  postTitle?: string;
  postContent?: string;
  postSlug?: string;
  postStatus?: string;
  authorId?: string;
  parentId?: string;
  menuOrder?: number;
  meta?: Record<string, string>;
}

export interface UpdatePostInput {
  postTitle?: string;
  postContent?: string;
  postSlug?: string;
  postStatus?: string;
  authorId?: string;
  parentId?: string | null;
  menuOrder?: number;
}

/**
 * PostRepository — CRUD operations for posts and their meta.
 * Keeps all writes in the same db connection (no async required with SQLite).
 */
export class PostRepository {
  constructor(private readonly db: Database.Database) {}

  async createPost(input: CreatePostInput): Promise<Post> {
    const filtered = await applyFilters(Hooks.CORE_POST_BEFORE_SAVE, input);
    const resolved = filtered as CreatePostInput;
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db
      .prepare(
        `INSERT INTO posts
          (id, site_id, post_type, post_title, post_content, post_slug, post_status, author_id, parent_id, menu_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        resolved.siteId,
        resolved.postType,
        resolved.postTitle ?? '',
        resolved.postContent ?? null,
        resolved.postSlug ?? null,
        resolved.postStatus ?? 'publish',
        resolved.authorId ?? null,
        resolved.parentId ?? null,
        resolved.menuOrder ?? 0,
        now,
        now
      );

    if (resolved.meta && Object.keys(resolved.meta).length > 0) {
      for (const [key, value] of Object.entries(resolved.meta)) {
        this.setMeta(id, key, value);
      }
    }

    const post = this.getById(id)!;
    await doAction(Hooks.CORE_POST_AFTER_SAVE, post);
    return post;
  }

  updatePost(id: string, input: UpdatePostInput): Post | null {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    const now = Math.floor(Date.now() / 1000);

    if (input.postTitle !== undefined) {
      fields.push('post_title = ?');
      values.push(input.postTitle);
    }
    if (input.postContent !== undefined) {
      fields.push('post_content = ?');
      values.push(input.postContent);
    }
    if (input.postSlug !== undefined) {
      fields.push('post_slug = ?');
      values.push(input.postSlug);
    }
    if (input.postStatus !== undefined) {
      fields.push('post_status = ?');
      values.push(input.postStatus);
    }
    if (input.authorId !== undefined) {
      fields.push('author_id = ?');
      values.push(input.authorId);
    }
    if ('parentId' in input) {
      fields.push('parent_id = ?');
      values.push(input.parentId ?? null);
    }
    if (input.menuOrder !== undefined) {
      fields.push('menu_order = ?');
      values.push(input.menuOrder);
    }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now, id);

    this.db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  /** Soft-delete: sets post_status to 'trash'. */
  trashPost(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db
      .prepare('UPDATE posts SET post_status = ?, updated_at = ? WHERE id = ?')
      .run('trash', now, id);
  }

  /** Hard-delete. Cascades to postmeta via FK. */
  async deletePost(id: string): Promise<void> {
    const post = this.getById(id);
    if (post) await doAction(Hooks.CORE_POST_BEFORE_DELETE, { id, siteId: post.siteId });
    this.db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  }

  getById(id: string): Post | null {
    const row = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
    if (!row) return null;
    const meta = this.getAllMeta(id);
    return this.mapRow(row, meta);
  }

  getMeta(postId: string, key: string): string | null {
    const row = this.db
      .prepare('SELECT meta_value FROM postmeta WHERE post_id = ? AND meta_key = ? LIMIT 1')
      .get(postId, key) as { meta_value: string | null } | undefined;
    return row?.meta_value ?? null;
  }

  setMeta(postId: string, key: string, value: string | null): void {
    const existing = this.db
      .prepare('SELECT id FROM postmeta WHERE post_id = ? AND meta_key = ? LIMIT 1')
      .get(postId, key) as { id: number } | undefined;

    if (existing) {
      this.db
        .prepare('UPDATE postmeta SET meta_value = ? WHERE post_id = ? AND meta_key = ?')
        .run(value, postId, key);
    } else {
      this.db
        .prepare('INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
        .run(postId, key, value);
    }
  }

  deleteMeta(postId: string, key: string): void {
    this.db.prepare('DELETE FROM postmeta WHERE post_id = ? AND meta_key = ?').run(postId, key);
  }

  getAllMeta(postId: string): PostMeta {
    const rows = this.db
      .prepare('SELECT meta_key, meta_value FROM postmeta WHERE post_id = ?')
      .all(postId) as Array<{ meta_key: string; meta_value: string | null }>;
    const meta: PostMeta = {};
    for (const r of rows) meta[r.meta_key] = r.meta_value;
    return meta;
  }

  private mapRow(r: any, meta: PostMeta): Post {
    return {
      id: r.id,
      siteId: r.site_id,
      postType: r.post_type,
      postStatus: r.post_status,
      postSlug: r.post_slug ?? null,
      postTitle: r.post_title,
      postContent: r.post_content ?? null,
      authorId: r.author_id ?? null,
      parentId: r.parent_id ?? null,
      menuOrder: r.menu_order ?? 0,
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
      meta,
    };
  }
}
