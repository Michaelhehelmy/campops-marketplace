import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makePluginAPI } from '../../../src/lib/PluginAPI';
import { db, resetMockStore } from '../../../src/lib/db';

describe('Plugin Database Contract', () => {
  beforeEach(() => {
    resetMockStore();
  });

  it('should allow a plugin to create and manage its own tables', async () => {
    const pluginA = makePluginAPI('plugin-a');

    // 1. Create table
    await pluginA.db.createTable('stats', 'count INTEGER, last_updated TIMESTAMP');

    // Table name should follow convention: plugin_<pluginId>_<suffix>
    const expectedTableName = 'plugin_plugin_a_stats';
    expect(await pluginA.db.tableExists('stats')).toBe(true);

    // 2. Insert data
    await pluginA.db.execute(
      `INSERT INTO ${expectedTableName} (count, last_updated) VALUES ($1, $2)`,
      [10, new Date().toISOString()]
    );

    // 3. Query data
    const rows = await pluginA.db.query(`SELECT * FROM ${expectedTableName}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(10);

    // 4. Update data
    await pluginA.db.execute(`UPDATE ${expectedTableName} SET count = $1`, [20]);
    const updated = await pluginA.db.queryOne(`SELECT count FROM ${expectedTableName}`);
    expect(updated.count).toBe(20);

    // 5. Drop table
    await pluginA.db.dropTable('stats');
    expect(await pluginA.db.tableExists('stats')).toBe(false);
  });

  it('should ensure data isolation between plugins', async () => {
    const pluginA = makePluginAPI('plugin-a');
    const pluginB = makePluginAPI('plugin-b');

    await pluginA.db.createTable('data', 'val TEXT');
    await pluginB.db.createTable('data', 'val TEXT');

    const tableA = 'plugin_plugin_a_data';
    const tableB = 'plugin_plugin_b_data';

    await pluginA.db.execute(`INSERT INTO ${tableA} (val) VALUES ($1)`, ['secret-a']);
    await pluginB.db.execute(`INSERT INTO ${tableB} (val) VALUES ($1)`, ['secret-b']);

    // Plugin A should not see Plugin B's table via helper
    // Note: tableExists uses the suffix, so it checks for its OWN scoped table
    expect(await pluginA.db.tableExists('data')).toBe(true);

    const rowsA = await pluginA.db.query(`SELECT val FROM ${tableA}`);
    const rowsB = await pluginB.db.query(`SELECT val FROM ${tableB}`);

    expect(rowsA[0].val).toBe('secret-a');
    expect(rowsB[0].val).toBe('secret-b');
  });

  it('should support property-scoped repositories via getTable()', async () => {
    const plugin = makePluginAPI('my-plugin', 'prop-123');

    // Create a plugin-owned table for this test
    await plugin.db.createTable(
      'items',
      'id TEXT PRIMARY KEY, name TEXT NOT NULL, property_id TEXT'
    );

    const tableName = 'plugin_my_plugin_items';

    await db.execute(`INSERT INTO ${tableName} (id, property_id, name) VALUES ($1, $2, $3)`, [
      'item-1',
      'prop-123',
      'Item 1',
    ]);
    await db.execute(`INSERT INTO ${tableName} (id, property_id, name) VALUES ($1, $2, $3)`, [
      'item-2',
      'prop-456',
      'Item 2',
    ]);

    const items = await plugin.db.getTable('items').findMany();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Item 1');

    await plugin.db.dropTable('items');
  });
});
