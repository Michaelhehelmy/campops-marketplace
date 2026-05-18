import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../runMigrations';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  return db;
}

describe('Core schema — sites', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });
  afterEach(() => db.close());

  it('inserts a site and reads it back', () => {
    db.prepare(
      "INSERT INTO sites (id, slug, name) VALUES ('s1', 'camp-alpha', 'Camp Alpha')"
    ).run();
    const row = db.prepare("SELECT * FROM sites WHERE id='s1'").get() as any;
    expect(row.slug).toBe('camp-alpha');
    expect(row.plan).toBe('basic');
    expect(row.is_active).toBe(1);
  });

  it('enforces UNIQUE constraint on slug', () => {
    db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s1', 'same-slug', 'A')").run();
    expect(() =>
      db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s2', 'same-slug', 'B')").run()
    ).toThrow(/UNIQUE/i);
  });
});

describe('Core schema — posts', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
    db.prepare(
      "INSERT INTO sites (id, slug, name) VALUES ('s1', 'camp-alpha', 'Camp Alpha')"
    ).run();
  });
  afterEach(() => db.close());

  it('inserts a post and reads it back', () => {
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_title) VALUES ('p1', 's1', 'listing', 'Cosy Tent')"
    ).run();
    const row = db.prepare("SELECT * FROM posts WHERE id='p1'").get() as any;
    expect(row.post_type).toBe('listing');
    expect(row.post_status).toBe('publish');
  });

  it('enforces unique slug per site+type', () => {
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_slug, post_title) VALUES ('p1','s1','listing','my-tent','A')"
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO posts (id, site_id, post_type, post_slug, post_title) VALUES ('p2','s1','listing','my-tent','B')"
        )
        .run()
    ).toThrow(/UNIQUE/i);
  });

  it('allows same slug for different post_types', () => {
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_slug, post_title) VALUES ('p1','s1','listing','shared','A')"
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO posts (id, site_id, post_type, post_slug, post_title) VALUES ('p2','s1','booking','shared','B')"
        )
        .run()
    ).not.toThrow();
  });

  it('cascades delete from sites to posts', () => {
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_title) VALUES ('p1', 's1', 'listing', 'Tent')"
    ).run();
    db.prepare("DELETE FROM sites WHERE id='s1'").run();
    const row = db.prepare("SELECT id FROM posts WHERE id='p1'").get();
    expect(row).toBeUndefined();
  });
});

describe('Core schema — postmeta', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
    db.prepare("INSERT INTO sites (id, slug, name) VALUES ('s1', 'camp-alpha', 'A')").run();
    db.prepare(
      "INSERT INTO posts (id, site_id, post_type, post_title) VALUES ('p1', 's1', 'listing', 'Tent')"
    ).run();
  });
  afterEach(() => db.close());

  it('inserts and reads meta', () => {
    db.prepare(
      "INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES ('p1','price','150')"
    ).run();
    const row = db
      .prepare("SELECT meta_value FROM postmeta WHERE post_id='p1' AND meta_key='price'")
      .get() as any;
    expect(row.meta_value).toBe('150');
  });

  it('cascades delete from posts to postmeta', () => {
    db.prepare("INSERT INTO postmeta (post_id, meta_key, meta_value) VALUES ('p1','k','v')").run();
    db.prepare("DELETE FROM posts WHERE id='p1'").run();
    const row = db.prepare("SELECT id FROM postmeta WHERE post_id='p1'").get();
    expect(row).toBeUndefined();
  });
});

describe('Core schema — options', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });
  afterEach(() => db.close());

  it('inserts an option and reads it back', () => {
    db.prepare(
      "INSERT INTO options (site_id, option_name, option_value) VALUES ('s1','active_theme','camp-classic')"
    ).run();
    const row = db
      .prepare("SELECT option_value FROM options WHERE site_id='s1' AND option_name='active_theme'")
      .get() as any;
    expect(row.option_value).toBe('camp-classic');
  });

  it('enforces UNIQUE(site_id, option_name)', () => {
    db.prepare(
      "INSERT INTO options (site_id, option_name, option_value) VALUES ('s1','k','v1')"
    ).run();
    expect(() =>
      db
        .prepare("INSERT INTO options (site_id, option_name, option_value) VALUES ('s1','k','v2')")
        .run()
    ).toThrow(/UNIQUE/i);
  });

  it('allows same option_name for different sites', () => {
    db.prepare(
      "INSERT INTO options (site_id, option_name, option_value) VALUES ('s1','theme','a')"
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO options (site_id, option_name, option_value) VALUES ('s2','theme','b')"
        )
        .run()
    ).not.toThrow();
  });
});
