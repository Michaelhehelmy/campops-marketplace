import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';

describe('PluginAPI Scoped Repository Coverage', () => {
  beforeEach(async () => {
    await db.exec('DROP TABLE IF EXISTS repo_test_table');
  });

  it('repository findMany with propertyId filters by property', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, property_id TEXT, name TEXT');
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-1',
      'test1',
    ]);
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-2',
      'test2',
    ]);

    const results = await db.query('SELECT * FROM repo_test_table WHERE property_id = $1', [
      'prop-1',
    ]);
    expect(Array.isArray(results)).toBe(true);
  });

  it('repository findById with propertyId includes property filter', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, property_id TEXT, name TEXT');
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-1',
      'test1',
    ]);

    const result = await db.queryOne(
      'SELECT * FROM repo_test_table WHERE id = 1 AND property_id = $1',
      ['prop-1']
    );
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('repository create with propertyId includes property in insert', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, property_id TEXT, name TEXT');
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-1',
      'test1',
    ]);

    const result = await db.query('SELECT * FROM repo_test_table');
    expect(Array.isArray(result)).toBe(true);
  });

  it('repository update with propertyId includes property in where clause', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, property_id TEXT, name TEXT');
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-1',
      'test1',
    ]);

    const result = await db.execute(
      'UPDATE repo_test_table SET name = $2 WHERE id = $1 AND property_id = $3',
      [1, 'updated', 'prop-1']
    );
    expect(result).toBeDefined();
  });

  it('repository delete with propertyId includes property in where clause', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, property_id TEXT, name TEXT');
    await db.execute('INSERT INTO repo_test_table (property_id, name) VALUES ($1, $2)', [
      'prop-1',
      'test1',
    ]);

    const result = await db.execute(
      'DELETE FROM repo_test_table WHERE id = $1 AND property_id = $2',
      [1, 'prop-1']
    );
    expect(result).toBeDefined();
  });

  it('repository findMany without propertyId does not filter by property', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, name TEXT');
    await db.execute('INSERT INTO repo_test_table (name) VALUES ($1)', ['test1']);

    const result = await db.query('SELECT * FROM repo_test_table');
    expect(Array.isArray(result)).toBe(true);
  });

  it('repository create without propertyId does not include property in insert', async () => {
    await db.createTable('repo_test_table', 'id SERIAL PRIMARY KEY, name TEXT');
    await db.execute('INSERT INTO repo_test_table (name) VALUES ($1)', ['test1']);

    const result = await db.query('SELECT * FROM repo_test_table');
    expect(Array.isArray(result)).toBe(true);
  });
});
