import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../runMigrations';
import { OptionsRepository } from '../OptionsRepository';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  return db;
}

describe('OptionsRepository', () => {
  let db: Database.Database;
  let opts: OptionsRepository;

  beforeEach(() => {
    db = freshDb();
    opts = new OptionsRepository(db);
  });
  afterEach(() => db.close());

  it('returns null for a missing option', () => {
    expect(opts.getOption('s1', 'missing')).toBeNull();
  });

  it('setOption creates an option and getOption reads it back', () => {
    opts.setOption('s1', 'active_theme', 'camp-classic');
    expect(opts.getOption('s1', 'active_theme')).toBe('camp-classic');
  });

  it('setOption updates an existing option', () => {
    opts.setOption('s1', 'theme', 'v1');
    opts.setOption('s1', 'theme', 'v2');
    expect(opts.getOption('s1', 'theme')).toBe('v2');
  });

  it('setOption can store null value', () => {
    opts.setOption('s1', 'nullable', null);
    expect(opts.getOption('s1', 'nullable')).toBeNull();
  });

  it('deleteOption removes the option', () => {
    opts.setOption('s1', 'key', 'val');
    opts.deleteOption('s1', 'key');
    expect(opts.getOption('s1', 'key')).toBeNull();
  });

  it('getAutoloadOptions returns only autoload=true options', () => {
    opts.setOption('s1', 'autoloaded', 'yes', true);
    opts.setOption('s1', 'lazy', 'no', false);

    const auto = opts.getAutoloadOptions('s1');
    expect(auto['autoloaded']).toBe('yes');
    expect('lazy' in auto).toBe(false);
  });

  it('getAllOptions returns all options for site', () => {
    opts.setOption('s1', 'a', '1');
    opts.setOption('s1', 'b', '2');
    opts.setOption('s2', 'c', '3');

    const all = opts.getAllOptions('s1');
    expect(all).toEqual({ a: '1', b: '2' });
  });

  it('options are scoped per site', () => {
    opts.setOption('s1', 'theme', 'blue');
    opts.setOption('s2', 'theme', 'red');

    expect(opts.getOption('s1', 'theme')).toBe('blue');
    expect(opts.getOption('s2', 'theme')).toBe('red');
  });
});
