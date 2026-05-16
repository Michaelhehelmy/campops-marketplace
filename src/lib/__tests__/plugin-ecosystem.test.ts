import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Marketplace Plugin Ecosystem', () => {
  const createOwnerAndProperty = async () => {
    const ownerId = uuidv4();
    const propertyId = uuidv4();

    await db
      .prepare(
        `
      INSERT INTO users (id, email, password) VALUES ($1, $2, $3)
    `
      )
      .run(ownerId, `test-owner-${uuidv4()}@example.com`, 'pass');

    const slug = `test-shop-${Math.floor(Math.random() * 1000000)}`;
    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain)
      VALUES ($1, $2, $3, $4, 'basic', true, $5)
    `
      )
      .run(propertyId, ownerId, 'Test Shop', slug, slug);

    return { ownerId, propertyId };
  };

  beforeEach(async () => {
    // Clean up test data - order matters for FK constraints
    await db.prepare("DELETE FROM plugin_analytics WHERE plugin_name LIKE 'test-%'").run();
    await db.prepare("DELETE FROM plugin_assets WHERE plugin_name LIKE 'test-%'").run();
    await db
      .prepare(
        "DELETE FROM property_plugins WHERE plugin_name LIKE 'test-%' OR property_id IN (SELECT id FROM properties WHERE slug LIKE 'test-%')"
      )
      .run();
    await db
      .prepare(
        "DELETE FROM property_staff WHERE property_id IN (SELECT id FROM properties WHERE slug LIKE 'test-%')"
      )
      .run();
    await db.prepare("DELETE FROM properties WHERE slug LIKE 'test-%'").run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'test-owner-%'").run();
    await db.prepare("DELETE FROM available_plugins WHERE name LIKE 'test-%'").run();
  });

  describe('Available Plugins Catalog', () => {
    it('should seed official plugins on schema load', async () => {
      const plugins = await db
        .prepare(
          `
        SELECT * FROM available_plugins WHERE is_official = true
      `
        )
        .all();

      expect(plugins.length).toBeGreaterThanOrEqual(4);

      const pluginNames = plugins.map((p) => p.name);
      expect(pluginNames).toContain('loyalty');
      expect(pluginNames).toContain('stripe-payments');
      expect(pluginNames).toContain('ical');
    });

    it('should create a new available plugin', async () => {
      const pluginId = uuidv4();
      const pluginName = `test-plugin-${Math.floor(Math.random() * 1000000)}`;

      await db
        .prepare(
          `
        INSERT INTO available_plugins 
        (id, name, display_name, description, category, version, manifest, entry_point_url, config_schema)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `
        )
        .run(
          pluginId,
          pluginName,
          'Test Plugin',
          'A plugin for testing',
          'general',
          '1.0.0',
          JSON.stringify({ permissions: ['test'], hooks: [] }),
          `/plugins/${pluginName}/bundle.js`,
          JSON.stringify({ setting1: { type: 'string' } })
        );

      const plugin = await db
        .prepare(
          `
        SELECT * FROM available_plugins WHERE id = $1
      `
        )
        .get(pluginId);

      expect(plugin).toBeTruthy();
      expect(plugin.name).toBe(pluginName);
      expect(plugin.displayName).toBe('Test Plugin');
      expect(plugin.manifest.permissions).toContain('test');
    });

    it('should filter plugins by category', async () => {
      // Create test plugins with specific categories
      await db
        .prepare(
          `
        INSERT INTO available_plugins (id, name, display_name, category, manifest)
        VALUES ($1, 'test-payment-1', 'Test Payment', 'payment', '{}')
      `
        )
        .run(uuidv4());

      await db
        .prepare(
          `
        INSERT INTO available_plugins (id, name, display_name, category, manifest)
        VALUES ($1, 'test-marketing-1', 'Test Marketing', 'marketing', '{}')
      `
        )
        .run(uuidv4());

      const allPlugins = await db
        .prepare(
          `
        SELECT * FROM available_plugins
      `
        )
        .all();

      const paymentPlugins = allPlugins.filter((p) => p.category === 'payment');
      const marketingPlugins = allPlugins.filter((p) => p.category === 'marketing');

      expect(paymentPlugins.some((p) => p.name === 'test-payment-1')).toBe(true);
      expect(marketingPlugins.some((p) => p.name === 'test-marketing-1')).toBe(true);
    });
  });

  describe('Plugin Assets (UI Injection)', () => {
    it('should store plugin assets for UI injection', async () => {
      const pluginName = `test-plugin-${Math.floor(Math.random() * 1000000)}`;

      // Create plugin first
      await db
        .prepare(
          `
        INSERT INTO available_plugins (name, display_name, category, manifest)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, 'Test Plugin', 'general', '{}');

      // Add assets
      const assetId1 = uuidv4();
      const assetId2 = uuidv4();

      await db
        .prepare(
          `
        INSERT INTO plugin_assets (id, plugin_name, asset_type, asset_url, target_location, load_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
        )
        .run(assetId1, pluginName, 'script', `/plugins/${pluginName}/bundle.js`, 'head', 1);

      await db
        .prepare(
          `
        INSERT INTO plugin_assets (id, plugin_name, asset_type, asset_url, target_location, load_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
        )
        .run(assetId2, pluginName, 'stylesheet', `/plugins/${pluginName}/style.css`, 'head', 2);

      const assets = await db
        .prepare(
          `
        SELECT * FROM plugin_assets WHERE plugin_name = $1 ORDER BY load_order
      `
        )
        .all(pluginName);

      expect(assets.length).toBe(2);
      expect(assets[0].asset_type).toBe('script');
      expect(assets[1].asset_type).toBe('stylesheet');
      expect(assets[0].target_location).toBe('head');
    });

    it('should fetch active assets for frontend injection', async () => {
      const { propertyId } = await createOwnerAndProperty();
      const pluginName = `test-plugin-${Math.floor(Math.random() * 1000000)}`;

      // Create plugin
      await db
        .prepare(
          `
        INSERT INTO available_plugins (name, display_name, category, manifest)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, 'Test Plugin', 'general', '{}');

      // Enable plugin for property
      await db
        .prepare(
          `
        INSERT INTO property_plugins (property_id, plugin_name, is_enabled, installed_version)
        VALUES ($1, $2, true, '1.0.0')
      `
        )
        .run(propertyId, pluginName);

      // Add active assets
      await db
        .prepare(
          `
        INSERT INTO plugin_assets (plugin_name, asset_type, asset_url, target_location, is_active)
        VALUES ($1, $2, $3, $4, true)
      `
        )
        .run(pluginName, 'script', `/plugins/${pluginName}/bundle.js`, 'head');

      // Fetch enabled plugins with assets
      const enabledPlugins = await db
        .prepare(
          `
        SELECT 
          pp.plugin_name,
          pp.config,
          pp.installed_version,
          ap.display_name,
          ap.manifest,
          ap.entry_point_url
        FROM property_plugins pp
        JOIN available_plugins ap ON ap.name = pp.plugin_name
        WHERE pp.property_id = $1 AND pp.is_enabled = true
      `
        )
        .all(propertyId);

      expect(enabledPlugins.length).toBeGreaterThanOrEqual(1);
      expect(enabledPlugins.some((p) => p.pluginName === pluginName)).toBe(true);

      // Fetch assets for the plugin
      const assets = await db
        .prepare(
          `
        SELECT * FROM plugin_assets 
        WHERE plugin_name = $1 AND is_active = true
      `
        )
        .all(pluginName);

      expect(assets.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Property Plugin Management', () => {
    it('should enable a plugin for a property', async () => {
      const { ownerId, propertyId } = await createOwnerAndProperty();
      const pluginName = `test-plugin-${Math.floor(Math.random() * 1000000)}`;

      // Create plugin
      await db
        .prepare(
          `
        INSERT INTO available_plugins (name, display_name, category, manifest)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, 'Test Plugin', 'general', '{}');

      // Enable plugin
      await db
        .prepare(
          `
        INSERT INTO property_plugins 
        (property_id, plugin_name, is_enabled, config, installed_version, installed_by)
        VALUES ($1, $2, true, $3, '1.0.0', $4)
      `
        )
        .run(propertyId, pluginName, JSON.stringify({ enabled: true }), ownerId);

      const enabledPlugin = await db
        .prepare(
          `
        SELECT * FROM property_plugins WHERE property_id = $1 AND plugin_name = $2
      `
        )
        .get(propertyId, pluginName);

      expect(enabledPlugin).toBeTruthy();
      expect(enabledPlugin.isEnabled).toBe(true);
      expect(enabledPlugin.config.enabled).toBe(true);
      expect(enabledPlugin.installed_version).toBe('1.0.0');
    });

    it('should disable a plugin for a property', async () => {
      const { propertyId } = await createOwnerAndProperty();
      const pluginName = `test-plugin-${Math.floor(Math.random() * 1000000)}`;

      // Create and enable plugin
      await db
        .prepare(
          `
        INSERT INTO available_plugins (name, display_name, category, manifest)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, 'Test Plugin', 'general', '{}');

      await db
        .prepare(
          `
        INSERT INTO property_plugins (property_id, plugin_name, is_enabled)
        VALUES ($1, $2, true)
      `
        )
        .run(propertyId, pluginName);

      // Disable plugin
      await db
        .prepare(
          `
        UPDATE property_plugins 
        SET is_enabled = false, last_disabled_at = CURRENT_TIMESTAMP
        WHERE property_id = $1 AND plugin_name = $2
      `
        )
        .run(propertyId, pluginName);

      const disabledPlugin = await db
        .prepare(
          `
        SELECT * FROM property_plugins WHERE property_id = $1 AND plugin_name = $2
      `
        )
        .get(propertyId, pluginName);

      expect(disabledPlugin).toBeTruthy();
      expect(disabledPlugin.isEnabled).toBe(false);
      expect(disabledPlugin.last_disabled_at).toBeTruthy();
    });

    it('should update plugin configuration', async () => {
      const { propertyId } = await createOwnerAndProperty();
      const pluginName = 'loyalty-program';

      // Enable plugin with initial config
      await db
        .prepare(
          `
        INSERT INTO property_plugins (property_id, plugin_name, is_enabled, config)
        VALUES ($1, $2, true, $3)
        ON CONFLICT (property_id, plugin_name) 
        DO UPDATE SET config = $3
      `
        )
        .run(propertyId, pluginName, JSON.stringify({ points_per_dollar: 1, welcome_bonus: 100 }));

      // Update config
      await db
        .prepare(
          `
        UPDATE property_plugins 
        SET config = $1
        WHERE property_id = $2 AND plugin_name = $3
      `
        )
        .run(JSON.stringify({ points_per_dollar: 2, welcome_bonus: 200 }), propertyId, pluginName);

      const plugin = await db
        .prepare(
          `
        SELECT * FROM property_plugins WHERE property_id = $1 AND plugin_name = $2
      `
        )
        .get(propertyId, pluginName);

      expect(plugin.config.points_per_dollar).toBe(2);
      expect(plugin.config.welcome_bonus).toBe(200);
    });

    it('should list active plugins with their manifests for the frontend', async () => {
      const { propertyId } = await createOwnerAndProperty();

      // Enable multiple plugins
      const plugins = ['loyalty', 'stripe-payments'];
      for (const pluginName of plugins) {
        await db
          .prepare(
            `
          INSERT INTO property_plugins (property_id, plugin_name, is_enabled, config)
          VALUES ($1, $2, true, $3)
          ON CONFLICT (property_id, plugin_name) DO NOTHING
        `
          )
          .run(propertyId, pluginName, JSON.stringify({ enabled: true }));
      }

      // Fetch active plugins with manifests
      const activePlugins = await db
        .prepare(
          `
        SELECT 
          pp.plugin_name,
          pp.config,
          pp.installed_version,
          pp.is_enabled,
          ap.display_name,
          ap.description,
          ap.manifest,
          ap.entry_point_url,
          ap.config_schema
        FROM property_plugins pp
        JOIN available_plugins ap ON ap.name = pp.plugin_name
        WHERE pp.property_id = $1
        ORDER BY ap.display_name
      `
        )
        .all(propertyId);

      const filteredPlugins = activePlugins.filter((p) => p.isEnabled === true);

      expect(filteredPlugins.length).toBeGreaterThanOrEqual(1);

      for (const plugin of filteredPlugins) {
        expect(plugin.pluginName).toBeTruthy();
        expect(plugin.manifest).toBeTruthy();
      }
    });
  });

  describe('Plugin Analytics', () => {
    it('should track plugin events', async () => {
      const { propertyId } = await createOwnerAndProperty();
      const pluginName = 'loyalty-program';

      // Track install event
      await db
        .prepare(
          `
        INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, propertyId, 'install', JSON.stringify({ version: '1.0.0' }));

      // Track enable event
      await db
        .prepare(
          `
        INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(pluginName, propertyId, 'enable', JSON.stringify({ enabled_by: 'owner' }));

      // Track usage event
      await db
        .prepare(
          `
        INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `
        )
        .run(
          pluginName,
          propertyId,
          'usage',
          JSON.stringify({ action: 'points_earned', amount: 100 })
        );

      const events = await db
        .prepare(
          `
        SELECT * FROM plugin_analytics 
        WHERE plugin_name = $1 AND property_id = $2
        ORDER BY created_at
      `
        )
        .all(pluginName, propertyId);

      expect(events.length).toBe(3);
      expect(events[0].event_type).toBe('install');
      expect(events[1].event_type).toBe('enable');
      expect(events[2].event_type).toBe('usage');
    });

    it('should aggregate plugin usage statistics', async () => {
      const { propertyId } = await createOwnerAndProperty();
      const pluginName = 'analytics-dashboard';

      // Add multiple usage events
      for (let i = 0; i < 5; i++) {
        await db
          .prepare(
            `
          INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
          VALUES ($1, $2, $3, $4)
        `
          )
          .run(pluginName, propertyId, 'usage', JSON.stringify({ feature: 'report_view' }));
      }

      const stats = await db
        .prepare(
          `
        SELECT 
          event_type,
          COUNT(*) as count
        FROM plugin_analytics
        WHERE plugin_name = $1 AND property_id = $2
        GROUP BY event_type
      `
        )
        .all(pluginName, propertyId);

      const usageStats = stats.find((s) => s.event_type === 'usage');
      expect(usageStats).toBeTruthy();
      expect(parseInt(usageStats.count)).toBe(5);
    });
  });
});
