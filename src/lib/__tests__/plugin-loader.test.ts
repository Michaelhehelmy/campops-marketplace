import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { runMigrations } from '../runMigrations';
import {
  PluginLoader,
  PlanRequirementError,
  PluginNotFoundError,
  planSatisfies,
  type PluginManifest,
} from '../PluginLoader';
import { addAction } from '../hooks';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  return db;
}

function seedPlugin(db: Database.Database, manifest: PluginManifest) {
  db.prepare(
    `
    INSERT INTO available_plugins
      (id, name, display_name, description, is_official, is_active, manifest,
       version, plan_requirement, post_types, review_status)
    VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, 'approved')
    ON CONFLICT(id) DO UPDATE SET manifest=excluded.manifest, plan_requirement=excluded.plan_requirement
  `
  ).run(
    manifest.id,
    manifest.id,
    manifest.name,
    manifest.description ?? null,
    JSON.stringify(manifest),
    manifest.version,
    manifest.planRequirement ?? 'basic',
    manifest.postTypes ? JSON.stringify(manifest.postTypes) : null
  );
}

function seedSitePlugin(db: Database.Database, siteId: string, pluginId: string, enabled: boolean) {
  db.prepare(
    'INSERT OR IGNORE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
  ).run(`pp-${siteId}-${pluginId}`, siteId, pluginId, enabled ? 1 : 0);
}

const BASIC_MANIFEST: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  planRequirement: 'basic',
};

const PREMIUM_MANIFEST: PluginManifest = {
  id: 'premium-plugin',
  name: 'Premium Plugin',
  version: '2.0.0',
  planRequirement: 'premium',
};

const POSTTYPE_MANIFEST: PluginManifest = {
  id: 'pt-plugin',
  name: 'Post Type Plugin',
  version: '1.0.0',
  planRequirement: 'basic',
  postTypes: [{ name: 'booking', label: 'Booking', labelPlural: 'Bookings' }],
};

// ─────────────────────────────────────────────────────────────────────────────

describe('planSatisfies()', () => {
  it('basic satisfies basic', () => expect(planSatisfies('basic', 'basic')).toBe(true));
  it('premium satisfies basic', () => expect(planSatisfies('premium', 'basic')).toBe(true));
  it('ultimate satisfies premium', () => expect(planSatisfies('ultimate', 'premium')).toBe(true));
  it('basic does NOT satisfy premium', () => expect(planSatisfies('basic', 'premium')).toBe(false));
  it('premium does NOT satisfy ultimate', () =>
    expect(planSatisfies('premium', 'ultimate')).toBe(false));
  it('unknown plan defaults to 0 (lowest)', () =>
    expect(planSatisfies('unknown', 'basic')).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PluginLoader — scan()', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-scan-'));
    db = freshDb();
    PluginLoader.setPluginsRoot(tmpDir);
  });
  afterEach(() => {
    db.close();
    PluginLoader.setPluginsRoot(path.join(process.cwd(), 'plugins'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when plugins dir is empty', () => {
    expect(PluginLoader.scan(db)).toHaveLength(0);
  });

  it('skips directories without plugin.json', () => {
    fs.mkdirSync(path.join(tmpDir, 'no-manifest'));
    expect(PluginLoader.scan(db)).toHaveLength(0);
  });

  it('registers a valid plugin.json into available_plugins', () => {
    const dir = path.join(tmpDir, 'my-plugin');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(BASIC_MANIFEST));

    const registered = PluginLoader.scan(db);
    expect(registered).toHaveLength(1);
    expect(registered[0].id).toBe('test-plugin');

    const row = db.prepare("SELECT id FROM available_plugins WHERE id='test-plugin'").get();
    expect(row).not.toBeUndefined();
  });

  it('scan is idempotent (second call does not duplicate rows)', () => {
    const dir = path.join(tmpDir, 'idem-plugin');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(BASIC_MANIFEST));

    PluginLoader.scan(db);
    PluginLoader.scan(db);

    const count = (
      db.prepare("SELECT count(*) as c FROM available_plugins WHERE id='test-plugin'").get() as any
    ).c;
    expect(count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PluginLoader — activate()', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedPlugin(db, BASIC_MANIFEST);
    seedPlugin(db, PREMIUM_MANIFEST);
    seedPlugin(db, POSTTYPE_MANIFEST);
  });
  afterEach(() => db.close());

  it('activates a basic plugin for a basic site', async () => {
    await PluginLoader.activate(db, 'site-1', 'test-plugin', 'basic');
    const active = PluginLoader.init(db, 'site-1');
    expect(active.some((p) => p.name === 'test-plugin')).toBe(true);
  });

  it('sets activated_at timestamp on activate', async () => {
    const before = Math.floor(Date.now() / 1000);
    await PluginLoader.activate(db, 'site-1', 'test-plugin', 'basic', 'user-42');
    const row = db
      .prepare(
        'SELECT activated_at, activated_by, version FROM property_plugins WHERE property_id=? AND plugin_name=?'
      )
      .get('site-1', 'test-plugin') as any;
    expect(row.activated_at).toBeGreaterThanOrEqual(before);
    expect(row.activated_by).toBe('user-42');
    expect(row.version).toBe('1.0.0');
  });

  it('throws PlanRequirementError when site plan is too low', async () => {
    await expect(PluginLoader.activate(db, 'site-1', 'premium-plugin', 'basic')).rejects.toThrow(
      PlanRequirementError
    );
  });

  it('activates premium plugin for premium site', async () => {
    await PluginLoader.activate(db, 'site-1', 'premium-plugin', 'premium');
    const active = PluginLoader.init(db, 'site-1');
    expect(active.some((p) => p.name === 'premium-plugin')).toBe(true);
  });

  it('re-activating an already-active plugin updates the record', async () => {
    seedSitePlugin(db, 'site-1', 'test-plugin', false);
    await PluginLoader.activate(db, 'site-1', 'test-plugin', 'basic');
    const row = db
      .prepare('SELECT is_enabled FROM property_plugins WHERE property_id=? AND plugin_name=?')
      .get('site-1', 'test-plugin') as any;
    expect(row.is_enabled).toBe(1);
  });

  it('throws PluginNotFoundError for unknown plugin', async () => {
    await expect(PluginLoader.activate(db, 'site-1', 'ghost-plugin', 'ultimate')).rejects.toThrow(
      PluginNotFoundError
    );
  });

  it('fires core:plugin:activated hook', async () => {
    const handler = vi.fn();
    addAction('core:plugin:activated', handler);
    await PluginLoader.activate(db, 'site-1', 'test-plugin', 'basic');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ pluginId: 'test-plugin', siteId: 'site-1' })
    );
  });

  it('fires core:post_type:registered for each declared post type', async () => {
    const handler = vi.fn();
    addAction('core:post_type:registered', handler);
    await PluginLoader.activate(db, 'site-1', 'pt-plugin', 'basic');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ postType: expect.objectContaining({ name: 'booking' }) })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PluginLoader — deactivate()', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedPlugin(db, BASIC_MANIFEST);
    seedSitePlugin(db, 'site-1', 'test-plugin', true);
  });
  afterEach(() => db.close());

  it('deactivates an active plugin', async () => {
    await PluginLoader.deactivate(db, 'site-1', 'test-plugin');
    const active = PluginLoader.init(db, 'site-1');
    expect(active.some((p) => p.name === 'test-plugin')).toBe(false);
  });

  it('fires core:plugin:deactivated hook', async () => {
    const handler = vi.fn();
    addAction('core:plugin:deactivated', handler);
    await PluginLoader.deactivate(db, 'site-1', 'test-plugin');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ pluginId: 'test-plugin', siteId: 'site-1' })
    );
  });

  it('does not throw when deactivating a non-installed plugin', async () => {
    await expect(PluginLoader.deactivate(db, 'site-1', 'not-installed')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PluginLoader — two-site isolation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedPlugin(db, BASIC_MANIFEST);
    seedPlugin(db, PREMIUM_MANIFEST);
  });
  afterEach(() => db.close());

  it('activating plugin for site-A does not affect site-B', async () => {
    await PluginLoader.activate(db, 'site-A', 'test-plugin', 'basic');
    const activeB = PluginLoader.init(db, 'site-B');
    expect(activeB.some((p) => p.name === 'test-plugin')).toBe(false);
  });

  it('each site can independently activate/deactivate plugins', async () => {
    await PluginLoader.activate(db, 'site-A', 'test-plugin', 'basic');
    await PluginLoader.activate(db, 'site-B', 'test-plugin', 'basic');
    await PluginLoader.deactivate(db, 'site-A', 'test-plugin');

    expect(PluginLoader.init(db, 'site-A').some((p) => p.name === 'test-plugin')).toBe(false);
    expect(PluginLoader.init(db, 'site-B').some((p) => p.name === 'test-plugin')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PluginLoader — list()', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedPlugin(db, BASIC_MANIFEST);
    seedPlugin(db, PREMIUM_MANIFEST);
  });
  afterEach(() => db.close());

  it('list() without plan filter returns all approved plugins', () => {
    const plugins = PluginLoader.list(db);
    expect(plugins.length).toBeGreaterThanOrEqual(2);
  });

  it('list(basic) excludes premium plugins', () => {
    const plugins = PluginLoader.list(db, 'basic');
    expect(plugins.some((p) => p.id === 'test-plugin')).toBe(true);
    expect(plugins.some((p) => p.id === 'premium-plugin')).toBe(false);
  });

  it('list(premium) includes both basic and premium plugins', () => {
    const plugins = PluginLoader.list(db, 'premium');
    expect(plugins.some((p) => p.id === 'test-plugin')).toBe(true);
    expect(plugins.some((p) => p.id === 'premium-plugin')).toBe(true);
  });
});
