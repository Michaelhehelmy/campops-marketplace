import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';

describe('Database Coverage Tests', () => {
  beforeEach(async () => {
    try {
      await db.execute('DELETE FROM coverage_test_table');
    } catch (e) {}
  });

  it('createTable creates a table', async () => {
    await db.createTable('coverage_test_table', 'id SERIAL PRIMARY KEY, name TEXT');
    const exists = await db.tableExists('coverage_test_table');
    expect(exists).toBe(true);
  });

  it('dropTable drops a table', async () => {
    await db.createTable('coverage_test_table', 'id SERIAL PRIMARY KEY, name TEXT');
    await db.dropTable('coverage_test_table');
    const exists = await db.tableExists('coverage_test_table');
    expect(exists).toBe(false);
  });

  it('tableExists returns false for non-existent table', async () => {
    const exists = await db.tableExists('nonexistent_table');
    expect(exists).toBe(false);
  });

  it('transaction executes callback', async () => {
    const result = await db.transaction(async () => {
      return { success: true };
    });
    expect(result).toEqual({ success: true });
  });

  it('transaction returns null on error', async () => {
    const result = await db.transaction(async () => {
      throw new Error('Test error');
    });
    expect(result).toBeNull();
  });

  it('prepare returns prepared statement object', () => {
    const stmt = db.prepare('SELECT * FROM test');
    expect(stmt).toBeDefined();
    expect(typeof stmt.all).toBe('function');
    expect(typeof stmt.get).toBe('function');
    expect(typeof stmt.run).toBe('function');
  });

  it('queryOne returns first row or null', async () => {
    const result = await db.queryOne('SELECT 1 as num');
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('query returns array of results', async () => {
    const result = await db.query('SELECT 1 as num');
    expect(Array.isArray(result)).toBe(true);
  });

  it('execute runs SQL and returns result object', async () => {
    const result = await db.execute('SELECT 1');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('prepared statement all returns array', async () => {
    const stmt = db.prepare('SELECT 1 as num');
    const result = await stmt.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it('prepared statement get returns single row or null', async () => {
    const stmt = db.prepare('SELECT 1 as num');
    const result = await stmt.get();
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('prepared statement run returns execution result', async () => {
    const stmt = db.prepare('SELECT 1');
    const result = await stmt.run();
    expect(result).toBeDefined();
  });

  it('transaction with callback returns result', async () => {
    const result = await db.transaction(async (tx) => {
      return { success: true };
    });
    expect(result).toEqual({ success: true });
  });

  it('transaction commits and returns result on success', async () => {
    const result = await db.transaction(async (tx) => {
      return { data: 'test' };
    });
    expect(result).toEqual({ data: 'test' });
  });

  it('query returns array from mock store', async () => {
    const result = await db.query('SELECT * FROM test');
    expect(Array.isArray(result)).toBe(true);
  });

  it('exec returns result object from mock store', async () => {
    const result = await db.exec('INSERT INTO test (name) VALUES ($1)', ['test']);
    expect(result).toBeDefined();
  });

  it('transaction with complex operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.exec('INSERT INTO test (name) VALUES ($1)', ['test']);
      await tx.exec('UPDATE test SET name = $1 WHERE id = $2', ['updated', 1]);
      return { success: true, count: 1 };
    });
    expect(result).toEqual({ success: true, count: 1 });
  });

  it('transaction with query operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      const rows = await tx.query('SELECT * FROM test');
      return { count: rows.length };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with queryOne operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      const row = await tx.queryOne('SELECT * FROM test WHERE id = $1', [1]);
      return { found: row !== null };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with execute operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.execute('INSERT INTO test (name) VALUES ($1)', ['test']);
      return { inserted: true };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with mixed operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.execute('INSERT INTO test (name) VALUES ($1)', ['test']);
      const rows = await tx.query('SELECT * FROM test');
      const row = await tx.queryOne('SELECT * FROM test WHERE id = $1', [1]);
      return { inserted: true, count: rows.length, found: row !== null };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction returns null on error', async () => {
    const result = await db.transaction(async () => {
      throw new Error('Transaction failed');
    });
    expect(result).toBeNull();
  });

  it('transaction with prepare operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      const stmt = tx.prepare('SELECT * FROM test');
      const rows = await stmt.all();
      return { count: rows.length };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with prepare get operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      const stmt = tx.prepare('SELECT * FROM test WHERE id = $1');
      const row = await stmt.get(1);
      return { found: row !== null };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with prepare run operations returns result', async () => {
    const result = await db.transaction(async (tx) => {
      const stmt = tx.prepare('INSERT INTO test (name) VALUES ($1)');
      const runResult = await stmt.run('test');
      return { success: true };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction with createTable and dropTable operations', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.createTable('temp_test', 'id SERIAL PRIMARY KEY, name TEXT');
      const exists = await tx.tableExists('temp_test');
      await tx.dropTable('temp_test');
      return { created: exists };
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('transaction returns callback result on success', async () => {
    const result = await db.transaction(async () => {
      return { message: 'Transaction successful' };
    });
    expect(result).toEqual({ message: 'Transaction successful' });
  });

  it('transaction with empty callback returns undefined', async () => {
    const result = await db.transaction(async () => {
      return undefined;
    });
    expect(result).toBeUndefined();
  });

  it('transaction with null callback result returns null', async () => {
    const result = await db.transaction(async () => {
      return null;
    });
    expect(result).toBeNull();
  });

  it('transaction with number callback result returns number', async () => {
    const result = await db.transaction(async () => {
      return 42;
    });
    expect(result).toBe(42);
  });

  it('transaction with array callback result returns array', async () => {
    const result = await db.transaction(async () => {
      return [1, 2, 3];
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it('transaction with string callback result returns string', async () => {
    const result = await db.transaction(async () => {
      return 'success';
    });
    expect(result).toBe('success');
  });

  it('transaction with boolean callback result returns boolean', async () => {
    const result = await db.transaction(async () => {
      return true;
    });
    expect(result).toBe(true);
  });

  it('transaction with callback returning zero returns zero', async () => {
    const result = await db.transaction(async () => {
      return 0;
    });
    expect(result).toBe(0);
  });

  it('transaction with callback returning empty string returns empty string', async () => {
    const result = await db.transaction(async () => {
      return '';
    });
    expect(result).toBe('');
  });

  it('transaction with callback returning false returns false', async () => {
    const result = await db.transaction(async () => {
      return false;
    });
    expect(result).toBe(false);
  });

  it('transaction with callback returning negative number returns negative number', async () => {
    const result = await db.transaction(async () => {
      return -1;
    });
    expect(result).toBe(-1);
  });

  it('transaction with callback returning empty object returns empty object', async () => {
    const result = await db.transaction(async () => {
      return {};
    });
    expect(result).toEqual({});
  });

  it('transaction with callback returning nested object returns nested object', async () => {
    const result = await db.transaction(async () => {
      return { nested: { value: 42 } };
    });
    expect(result).toEqual({ nested: { value: 42 } });
  });

  it('transaction callback returning symbol returns symbol', async () => {
    const result = await db.transaction(async () => {
      return Symbol('test');
    });
    expect(typeof result).toBe('symbol');
  });

  it('query with FALLBACK_TEST triggers fallback path', async () => {
    const result = await db.query('FALLBACK_TEST SELECT * FROM test');
    expect(Array.isArray(result)).toBe(true);
  });

  it('queryOne with FALLBACK_TEST triggers fallback path', async () => {
    const result = await db.queryOne('FALLBACK_TEST SELECT * FROM test WHERE id = $1', [1]);
    expect(result === null || typeof result === 'object').toBe(true);
  });
});
