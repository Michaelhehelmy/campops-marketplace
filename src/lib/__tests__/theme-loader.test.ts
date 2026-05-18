import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { runMigrations } from '../runMigrations';
import { ThemeLoader } from '../ThemeLoader';
import { ThemeRegistry } from '../ThemeRegistry';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db, MIGRATIONS_DIR);
  return db;
}

function makeThemesDir(tmpDir: string, themeId: string, manifest: object): string {
  const themeDir = path.join(tmpDir, themeId);
  fs.mkdirSync(themeDir, { recursive: true });
  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(manifest));
  return themeDir;
}

describe('ThemeLoader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-test-'));
    ThemeLoader.clearCache();
    ThemeLoader.setThemesRoot(tmpDir);
  });

  afterEach(() => {
    ThemeLoader.clearCache();
    ThemeLoader.setThemesRoot(path.join(process.cwd(), 'themes'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('load returns null for a missing theme', () => {
    expect(ThemeLoader.load('nonexistent')).toBeNull();
  });

  it('load reads and returns a valid theme.json', () => {
    makeThemesDir(tmpDir, 'test-theme', {
      id: 'test-theme', name: 'test-theme', displayName: 'Test Theme',
      version: '1.0.0', planRequirement: 'basic',
    });

    const manifest = ThemeLoader.load('test-theme');
    expect(manifest).not.toBeNull();
    expect(manifest?.displayName).toBe('Test Theme');
  });

  it('load caches the manifest (second call skips disk read)', () => {
    makeThemesDir(tmpDir, 'cached-theme', {
      id: 'cached-theme', name: 'cached-theme', displayName: 'Cached',
      version: '1.0.0', planRequirement: 'basic',
    });

    ThemeLoader.load('cached-theme');
    // Overwrite the file — cached version should still be returned
    fs.writeFileSync(
      path.join(tmpDir, 'cached-theme', 'theme.json'),
      JSON.stringify({ id: 'cached-theme', name: 'cached-theme', displayName: 'Modified', version: '2.0.0', planRequirement: 'basic' })
    );
    const manifest = ThemeLoader.load('cached-theme');
    expect(manifest?.displayName).toBe('Cached');
  });

  it('resolveTemplate returns fallback when no templates dir exists', () => {
    makeThemesDir(tmpDir, 'bare-theme', {
      id: 'bare-theme', name: 'bare-theme', displayName: 'Bare',
      version: '1.0.0', planRequirement: 'basic',
      templateHierarchy: { listing: ['listing-single', 'default'] },
    });

    const result = ThemeLoader.resolveTemplate('bare-theme', 'listing');
    expect(result.templateName).toBe('default');
    expect(result.templatePath).toBeNull();
  });

  it('resolveTemplate finds a matching template file', () => {
    makeThemesDir(tmpDir, 'full-theme', {
      id: 'full-theme', name: 'full-theme', displayName: 'Full',
      version: '1.0.0', planRequirement: 'basic',
      templateHierarchy: { listing: ['listing-single', 'default'] },
    });
    const templatesDir = path.join(tmpDir, 'full-theme', 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'listing-single.tsx'), '// template');

    const result = ThemeLoader.resolveTemplate('full-theme', 'listing');
    expect(result.templateName).toBe('listing-single');
    expect(result.templatePath).toContain('listing-single.tsx');
  });

  it('resolveTemplate falls back through hierarchy until found', () => {
    makeThemesDir(tmpDir, 'fallback-theme', {
      id: 'fallback-theme', name: 'fallback-theme', displayName: 'Fallback',
      version: '1.0.0', planRequirement: 'basic',
      templateHierarchy: { listing: ['listing-single', 'single', 'default'] },
    });
    const templatesDir = path.join(tmpDir, 'fallback-theme', 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'single.tsx'), '// single template');

    const result = ThemeLoader.resolveTemplate('fallback-theme', 'listing');
    expect(result.templateName).toBe('single');
  });

  it('getWidgetAreas returns empty array for unknown theme', () => {
    expect(ThemeLoader.getWidgetAreas('unknown')).toEqual([]);
  });

  it('getCustomFields returns field definitions from theme.json', () => {
    makeThemesDir(tmpDir, 'cf-theme', {
      id: 'cf-theme', name: 'cf-theme', displayName: 'CF',
      version: '1.0.0', planRequirement: 'basic',
      customFields: [{ key: 'price', label: 'Price', type: 'number' }],
    });

    const fields = ThemeLoader.getCustomFields('cf-theme');
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('price');
  });
});

describe('ThemeRegistry', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-test-'));
    db = freshDb();
    ThemeLoader.clearCache();
    ThemeRegistry.setThemesRoot(tmpDir);
  });

  afterEach(() => {
    db.close();
    ThemeLoader.clearCache();
    ThemeRegistry.setThemesRoot(path.join(process.cwd(), 'themes'));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('register returns empty array when themes dir is empty', () => {
    const result = ThemeRegistry.register(db);
    expect(result).toHaveLength(0);
  });

  it('register inserts theme into available_themes table', () => {
    makeThemesDir(tmpDir, 'my-theme', {
      id: 'my-theme', name: 'my-theme', displayName: 'My Theme',
      version: '1.0.0', planRequirement: 'basic',
    });

    const registered = ThemeRegistry.register(db);
    expect(registered).toHaveLength(1);
    expect(registered[0].id).toBe('my-theme');

    const row = db.prepare("SELECT id FROM available_themes WHERE id='my-theme'").get();
    expect(row).not.toBeUndefined();
  });

  it('register is idempotent (re-run does not duplicate rows)', () => {
    makeThemesDir(tmpDir, 'idem-theme', {
      id: 'idem-theme', name: 'idem-theme', displayName: 'Idem',
      version: '1.0.0', planRequirement: 'basic',
    });

    ThemeRegistry.register(db);
    ThemeRegistry.register(db);

    const count = (db.prepare("SELECT count(*) as c FROM available_themes WHERE id='idem-theme'").get() as any).c;
    expect(count).toBe(1);
  });

  it('activate sets active_theme option for the site', () => {
    makeThemesDir(tmpDir, 'act-theme', {
      id: 'act-theme', name: 'act-theme', displayName: 'Act',
      version: '1.0.0', planRequirement: 'basic',
    });
    ThemeRegistry.register(db);

    ThemeRegistry.activate(db, 'site-1', 'act-theme');

    const theme = ThemeRegistry.getForSite(db, 'site-1');
    expect(theme?.id).toBe('act-theme');
  });

  it('activate throws for non-existent theme', () => {
    expect(() => ThemeRegistry.activate(db, 'site-1', 'ghost-theme')).toThrow();
  });

  it('list returns all active themes', () => {
    makeThemesDir(tmpDir, 'theme-a', { id: 'theme-a', name: 'theme-a', displayName: 'A', version: '1.0.0', planRequirement: 'basic' });
    makeThemesDir(tmpDir, 'theme-b', { id: 'theme-b', name: 'theme-b', displayName: 'B', version: '1.0.0', planRequirement: 'premium' });
    ThemeRegistry.register(db);

    const themes = ThemeRegistry.list(db);
    expect(themes.length).toBeGreaterThanOrEqual(2);
    expect(themes.some((t) => t.id === 'theme-a')).toBe(true);
    expect(themes.some((t) => t.id === 'theme-b')).toBe(true);
  });
});
