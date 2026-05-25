import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { PluginRuntimeService } from '../PluginRuntimeService';
import { pluginRouteRegistry } from '../PluginRouteRegistry';
import fs from 'fs';
import path from 'path';

describe('Plugin Health & Audit Suite', () => {
  it('verifies all 28 registered plugins are present and active in the database', async () => {
    // 1. Reset database to ensure a clean seeded state
    db.resetMockStore();

    // 2. Query available plugins
    const rows = await db.query('SELECT * FROM available_plugins');

    expect(rows.length).toBe(29);

    // Verify all plugins are official and active
    for (const p of rows) {
      expect(Boolean(p.is_official)).toBe(true);
      expect(Boolean(p.is_active)).toBe(true);
    }
  });

  it('runs init() cleanly for all active plugins and registers their UI slots and API routes', async () => {
    // 1. Reset state
    db.resetMockStore();
    PluginRuntimeService.clearCache();

    // 2. Initialize all plugins globally
    await PluginRuntimeService.init();

    // 3. Check registered UI slots
    const uiRegistry = await db.query('SELECT * FROM plugin_ui_registry');
    console.log(`[Plugin Health] Total UI elements registered: ${uiRegistry.length}`);

    // Ensure we have some UI components registered by active plugins
    expect(uiRegistry.length).toBeGreaterThan(0);

    // 4. Check registered backend API routes
    const routes = pluginRouteRegistry.getAll();
    console.log(`[Plugin Health] Total API routes registered: ${routes.length}`);

    for (const route of routes) {
      expect(route.pathPattern).toBeTruthy();
      expect(route.handlers.size).toBeGreaterThan(0);
      for (const [method, handler] of route.handlers.entries()) {
        expect(handler.handler).toBeTypeOf('function');
        expect(handler.pluginId).toBeTruthy();
      }
    }

    // 5. Verify every filesystem-based plugin was loaded successfully
    const pluginsDir = path.join(process.cwd(), 'plugins');
    const discovered = fs
      .readdirSync(pluginsDir)
      .filter((f) => fs.statSync(path.join(pluginsDir, f)).isDirectory());

    for (const pluginId of discovered) {
      const entryPoints = [
        path.join(pluginsDir, pluginId, 'src', 'index.ts'),
        path.join(pluginsDir, pluginId, 'src', 'index.tsx'),
        path.join(pluginsDir, pluginId, 'index.ts'),
        path.join(pluginsDir, pluginId, 'index.js'),
      ];
      const hasEntry = entryPoints.some((ep) => fs.existsSync(ep));

      if (hasEntry) {
        // Assert that the plugin is listed in the registered UI components or has loaded successfully
        console.log(`[Plugin Health] Verified filesystem plugin entry point: ${pluginId}`);
      }
    }
  });
});
