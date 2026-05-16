import { test, expect } from '@playwright/test';

/**
 * Database Setup Test
 *
 * Runs first (alphabetically) to ensure a clean DB state for all tests.
 * Resets the database and sets known initial plugin states.
 */
test.describe('DB Setup', () => {
  test('Reset database to clean state', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/test/reset');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
