import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { runMigrations } from '../runMigrations';
import { RequestContext, type RequestContextData } from '../RequestContext';
import { getContext, NoRequestContextError } from '../getContext';
import { SiteBootstrap } from '../SiteBootstrap';
import { OptionsRepository } from '../OptionsRepository';
import { ThemeRegistry } from '../ThemeRegistry';
import { ThemeLoader } from '../ThemeLoader';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  return db;
}

function makeCtx(overrides?: Partial<RequestContextData>): RequestContextData {
  return {
    siteId: 'site-1',
    siteSlug: 'test-site',
    plan: 'basic',
    theme: null,
    activePlugins: [],
    autoloadOptions: new Map(),
    isMainDomain: false,
    ...overrides,
  };
}

describe('RequestContext', () => {
  it('current() returns null outside a run scope', () => {
    expect(RequestContext.current()).toBeNull();
  });

  it('run() makes context available via current()', async () => {
    const ctx = makeCtx({ siteId: 'site-abc' });
    let captured: RequestContextData | null = null;

    await RequestContext.run(ctx, async () => {
      captured = RequestContext.current();
    });

    expect(captured!.siteId).toBe('site-abc');
  });

  it('current() returns null again after run() completes', async () => {
    await RequestContext.run(makeCtx(), async () => {});
    expect(RequestContext.current()).toBeNull();
  });

  it('two concurrent run() calls do not bleed into each other', async () => {
    const results: string[] = [];

    await Promise.all([
      RequestContext.run(makeCtx({ siteId: 'site-A' }), async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(RequestContext.current()!.siteId);
      }),
      RequestContext.run(makeCtx({ siteId: 'site-B' }), async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push(RequestContext.current()!.siteId);
      }),
    ]);

    expect(results).toContain('site-A');
    expect(results).toContain('site-B');
    expect(results).toHaveLength(2);
    // Each run saw only its own siteId (no cross-contamination proved by uniqueness)
    expect(new Set(results).size).toBe(2);
  });

  it('context carries activePlugins correctly', async () => {
    const ctx = makeCtx({ activePlugins: ['booking', 'crm'] });
    let plugins: string[] = [];

    await RequestContext.run(ctx, async () => {
      plugins = RequestContext.current()!.activePlugins;
    });

    expect(plugins).toEqual(['booking', 'crm']);
  });

  it('context carries autoloadOptions Map', async () => {
    const opts = new Map([
      ['siteurl', 'https://example.com'],
      ['home', 'https://example.com'],
    ]);
    const ctx = makeCtx({ autoloadOptions: opts });
    let captured: Map<string, string | null> | null = null;

    await RequestContext.run(ctx, async () => {
      captured = RequestContext.current()!.autoloadOptions as Map<string, string | null>;
    });

    expect(captured!.get('siteurl')).toBe('https://example.com');
  });
});

describe('getContext()', () => {
  it('throws NoRequestContextError outside a run scope', () => {
    expect(() => getContext()).toThrow(NoRequestContextError);
    expect(() => getContext()).toThrow('getContext() called outside a RequestContext scope');
  });

  it('returns the context inside a run scope', async () => {
    const ctx = makeCtx({ siteId: 'site-xyz' });
    let result: RequestContextData | null = null;

    await RequestContext.run(ctx, async () => {
      result = getContext();
    });

    expect(result!.siteId).toBe('site-xyz');
  });
});

describe('SiteBootstrap', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    db.exec(
      'CREATE TABLE IF NOT EXISTS property_plugins (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, plugin_name TEXT NOT NULL, is_enabled INTEGER, UNIQUE(property_id, plugin_name))'
    );
    db.prepare(
      'INSERT OR IGNORE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
    ).run('pp-test', 'site-1', 'booking', 1);
    db.prepare(
      'INSERT OR IGNORE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
    ).run('pp-test2', 'site-1', 'crm', 0);
  });
  afterEach(() => db.close());

  it('loadActivePlugins returns only enabled plugins', () => {
    const bs = new SiteBootstrap(db);
    const plugins = bs.loadActivePlugins('site-1');
    expect(plugins).toContain('booking');
    expect(plugins).not.toContain('crm');
  });

  it('loadActivePlugins returns empty array for unknown site', () => {
    const bs = new SiteBootstrap(db);
    expect(bs.loadActivePlugins('nonexistent')).toEqual([]);
  });

  it('loadAutoloadOptions returns Map of autoload=1 options', () => {
    const opts = new OptionsRepository(db);
    opts.setOption('site-1', 'siteurl', 'https://mycamp.com', true);
    opts.setOption('site-1', 'hidden_key', 'secret', false);

    const bs = new SiteBootstrap(db);
    const map = bs.loadAutoloadOptions('site-1');
    expect(map.get('siteurl')).toBe('https://mycamp.com');
    expect(map.has('hidden_key')).toBe(false);
  });

  it('loadAutoloadOptions returns empty Map for unknown site', () => {
    const bs = new SiteBootstrap(db);
    expect(bs.loadAutoloadOptions('unknown').size).toBe(0);
  });

  it('loadTheme returns null when no theme is activated', () => {
    const bs = new SiteBootstrap(db);
    expect(bs.loadTheme('site-1')).toBeNull();
  });

  it('loadTheme returns manifest when theme is activated', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-theme-'));
    const themeDir = path.join(tmpDir, 'ctx-theme');
    fs.mkdirSync(themeDir);
    fs.writeFileSync(
      path.join(themeDir, 'theme.json'),
      JSON.stringify({
        id: 'ctx-theme',
        name: 'ctx-theme',
        displayName: 'Ctx Theme',
        version: '1.0.0',
        planRequirement: 'basic',
      })
    );

    ThemeLoader.clearCache();
    ThemeRegistry.setThemesRoot(tmpDir);
    ThemeRegistry.register(db);
    ThemeRegistry.activate(db, 'site-1', 'ctx-theme');

    const bs = new SiteBootstrap(db);
    const manifest = bs.loadTheme('site-1');
    expect(manifest?.id).toBe('ctx-theme');

    ThemeLoader.clearCache();
    ThemeRegistry.setThemesRoot(path.join(process.cwd(), 'themes'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
