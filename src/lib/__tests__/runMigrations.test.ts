import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { runMigrations } from '../runMigrations';

describe('runMigrations', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-test-'));
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('applies a single SQL file and records it in schema_migrations', () => {
    fs.writeFileSync(
      path.join(tmpDir, '001_create_foo.sql'),
      'CREATE TABLE foo (id INTEGER PRIMARY KEY);'
    );
    const results = runMigrations(db, tmpDir);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ version: '001_create_foo', applied: true, skipped: false });

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='foo'")
      .all();
    expect(tables).toHaveLength(1);

    const rows = db.prepare('SELECT version FROM schema_migrations').all() as { version: string }[];
    expect(rows[0].version).toBe('001_create_foo');
  });

  it('skips already-applied migrations', () => {
    fs.writeFileSync(
      path.join(tmpDir, '001_create_foo.sql'),
      'CREATE TABLE foo (id INTEGER PRIMARY KEY);'
    );
    runMigrations(db, tmpDir);
    const results = runMigrations(db, tmpDir);

    expect(results[0]).toMatchObject({ version: '001_create_foo', applied: false, skipped: true });
  });

  it('applies migrations in ascending filename order', () => {
    fs.writeFileSync(
      path.join(tmpDir, '002_create_bar.sql'),
      'CREATE TABLE bar (id INTEGER PRIMARY KEY);'
    );
    fs.writeFileSync(
      path.join(tmpDir, '001_create_foo.sql'),
      'CREATE TABLE foo (id INTEGER PRIMARY KEY);'
    );
    const results = runMigrations(db, tmpDir);

    expect(results.map((r) => r.version)).toEqual(['001_create_foo', '002_create_bar']);
    expect(results.every((r) => r.applied)).toBe(true);
  });

  it('stops at first failing migration and records the error', () => {
    fs.writeFileSync(path.join(tmpDir, '001_bad.sql'), 'THIS IS NOT VALID SQL !!!;');
    fs.writeFileSync(
      path.join(tmpDir, '002_good.sql'),
      'CREATE TABLE good (id INTEGER PRIMARY KEY);'
    );
    const results = runMigrations(db, tmpDir);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ version: '001_bad', applied: false, skipped: false });
    expect(results[0].error).toBeTruthy();

    const goodExists = db.prepare("SELECT name FROM sqlite_master WHERE name='good'").get();
    expect(goodExists).toBeUndefined();
  });

  it('returns empty array when migrations directory does not exist', () => {
    const results = runMigrations(db, '/nonexistent/path/that/should/not/exist');
    expect(results).toHaveLength(0);
  });

  it('ignores .rollback.sql files', () => {
    fs.writeFileSync(
      path.join(tmpDir, '001_create_foo.sql'),
      'CREATE TABLE foo (id INTEGER PRIMARY KEY);'
    );
    fs.writeFileSync(path.join(tmpDir, '001_create_foo.rollback.sql'), 'DROP TABLE foo;');
    const results = runMigrations(db, tmpDir);

    expect(results).toHaveLength(1);
    expect(results[0].version).toBe('001_create_foo');
  });
});
