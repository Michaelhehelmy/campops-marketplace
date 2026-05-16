import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';

describe('Database Wrapper', () => {
  beforeEach(async () => {
    // Clear the mock store before each test
    await db.prepare('DELETE FROM test_table').run();
  });

  describe('Basic CRUD', () => {
    it('should insert and retrieve data using prepare', async () => {
      await db
        .prepare('INSERT INTO test_table (id, name, is_active) VALUES ($1, $2, $3)')
        .run('1', 'Test Item', true);

      const item = await db.prepare('SELECT * FROM test_table WHERE id = $1').get('1');
      expect(item).toBeDefined();
      expect(item.id).toBe('1');
      expect(item.name).toBe('Test Item');
      expect(item.isActive).toBe(true);
    });

    it('should update data', async () => {
      await db.prepare('INSERT INTO test_table (id, name) VALUES ($1, $2)').run('1', 'Old Name');
      await db.prepare('UPDATE test_table SET name = $1 WHERE id = $2').run('New Name', '1');

      const item = await db.prepare('SELECT * FROM test_table WHERE id = $1').get('1');
      expect(item.name).toBe('New Name');
    });

    it('should handle multi-row queries with all()', async () => {
      await db.prepare('INSERT INTO test_table (id, name) VALUES ($1, $2)').run('1', 'A');
      await db.prepare('INSERT INTO test_table (id, name) VALUES ($1, $2)').run('2', 'B');

      const items = await db.prepare('SELECT * FROM test_table').all();
      expect(items.length).toBe(2);
    });

    it('should delete data', async () => {
      await db.prepare('INSERT INTO test_table (id) VALUES ($1)').run('trash');
      await db.prepare('DELETE FROM test_table WHERE id = $1').run('trash');

      const item = await db.prepare('SELECT * FROM test_table WHERE id = $1').get('trash');
      expect(item).toBeNull();
    });
  });

  describe('Advanced Mock Features', () => {
    it('should handle COUNT(*) queries', async () => {
      await db.prepare('INSERT INTO stats (val) VALUES ($1)').run(10);
      await db.prepare('INSERT INTO stats (val) VALUES ($1)').run(20);

      const result = await db.prepare('SELECT COUNT(*) FROM stats').get();
      expect(result.count).toBe(2);
    });

    it('should handle GROUP BY with COUNT(*)', async () => {
      await db.prepare('INSERT INTO events (type) VALUES ($1)').run('click');
      await db.prepare('INSERT INTO events (type) VALUES ($1)').run('click');
      await db.prepare('INSERT INTO events (type) VALUES ($1)').run('view');

      const stats = await db
        .prepare('SELECT type, COUNT(*) as count FROM events GROUP BY type')
        .all();
      expect(stats).toContainEqual(expect.objectContaining({ type: 'click', count: 2 }));
      expect(stats).toContainEqual(expect.objectContaining({ type: 'view', count: 1 }));
    });

    it('should support exec() for direct SQL', async () => {
      await db.exec('DELETE FROM test_table');
      const items = await db.prepare('SELECT * FROM test_table').all();
      expect(items.length).toBe(0);
    });
  });

  describe('Transactions', () => {
    it('should commit successful transactions', async () => {
      await db.transaction(async (tx) => {
        await tx.prepare('INSERT INTO test_table (id) VALUES ($1)').run('tx-1');
        await tx.prepare('INSERT INTO test_table (id) VALUES ($1)').run('tx-2');
      });

      const items = await db.prepare('SELECT * FROM test_table').all();
      expect(items.length).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      try {
        await db.transaction(async (tx) => {
          await tx.prepare('INSERT INTO test_table (id) VALUES ($1)').run('fail-1');
          throw new Error('Force failure');
        });
      } catch (e) {
        // Expected
      }

      const item = await db.prepare('SELECT * FROM test_table WHERE id = $1').get('fail-1');
      expect(item).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should warn (not throw) for invalid SQL in prepare', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // The db wrapper catches prepare errors and returns a stub — it does NOT throw
      const stmt = db.prepare('INVALID SQL STATEMENT');
      expect(stmt).toBeDefined();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should return empty results from stub when prepare fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const stmt = db.prepare('INVALID SQL STATEMENT');
      const result = await stmt.all();
      expect(result).toEqual([]);

      warnSpy.mockRestore();
    });

    it('should return stub result (not throw) for DELETE on non-existent table', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // The db wrapper returns a no-op stub for invalid SQL — it does NOT throw
      const result = await db.execute('DELETE FROM non_existent_table');
      // Stub returns { changes: 0, lastInsertRowid: null }
      expect(result).toBeDefined();

      warnSpy.mockRestore();
    });
  });

  describe('Table Existence', () => {
    it('should return true if table exists', async () => {
      const exists = await db.tableExists('users');
      expect(exists).toBe(true);
    });

    it('should return false if table does not exist', async () => {
      const exists = await db.tableExists('missing_table');
      expect(exists).toBe(false);
    });
  });
});
