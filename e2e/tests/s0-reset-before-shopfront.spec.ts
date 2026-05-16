import { test, expect } from '@playwright/test';

/**
 * State Reset Before Shopfront Tests
 *
 * Runs alphabetically before shopfront-staff.spec.ts and shopfront-staff-full.spec.ts
 * to ensure a clean reservation state so check-in assertions find exactly one match.
 */
test.describe('Reset Before Shopfront', () => {
  test('Reset database state before shopfront tests', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/test/reset');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
