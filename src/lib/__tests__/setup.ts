import { beforeAll, afterEach } from 'vitest';
import { db, clearMockStore } from '../db';
import fs from 'fs';
import path from 'path';

afterEach(() => {
  if (!process.env.DATABASE_URL) {
    clearMockStore();
  }
});

let schemaApplied = false;

beforeAll(async () => {
  // If no DATABASE_URL is provided, we assume we're running unit tests with mocked DB
  if (!process.env.DATABASE_URL) {
    console.info('[Test Setup] No DATABASE_URL provided, skipping real DB initialization.');
    return;
  }

  // Ensure we are using a test database if URL is provided
  if (!process.env.DATABASE_URL.includes('_test')) {
    throw new Error('Tests must be run against a _test database');
  }

  // Use a singleton pattern to prevent concurrent schema execution
  if (schemaApplied) {
    return;
  }

  // Try to acquire a lock by creating a marker table
  try {
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS _test_setup_lock (
        id INTEGER PRIMARY KEY DEFAULT 1,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
      )
      .run();

    // Try to insert - if it fails due to unique constraint, another process is setting up
    const result = await db
      .prepare(
        `
      INSERT INTO _test_setup_lock (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
      )
      .get();

    if (!result) {
      // Another process is handling schema setup, wait briefly
      await new Promise((r) => setTimeout(r, 500));
      schemaApplied = true;
      return;
    }

    // We got the lock, apply schema
    const schemaPath = path.resolve(__dirname, '../../../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
    schemaApplied = true;
  } catch (err) {
    console.error('Schema setup failed:', err);
    throw err;
  }
}, 60000); // 60 second timeout for schema setup
