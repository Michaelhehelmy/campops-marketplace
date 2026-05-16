import { test, expect } from '@playwright/test';

/**
 * Plugin State Reset
 *
 * Runs before plugin-lifecycle.spec.ts to ensure booking plugin
 * starts in the expected disabled state for Safari Camp.
 * This allows the plugin-lifecycle tests to test enable/disable flow.
 */
test.describe('Plugin State Reset', () => {
  test('Reset plugin state for plugin-lifecycle tests', async ({ request }) => {
    // Reset Safari Camp booking plugin to disabled state
    const response = await request.post('http://localhost:3000/api/master/plugins', {
      headers: { 'Content-Type': 'application/json' },
      data: { pluginId: 'booking', propertyId: '1', enabled: false },
    });
    expect(response.status()).toBe(200);

    // Enable Mountain Lodge booking to allow Scenario 5 to disable it
    const response2 = await request.post('http://localhost:3000/api/master/plugins', {
      headers: { 'Content-Type': 'application/json' },
      data: { pluginId: 'booking', propertyId: '2', enabled: true },
    });
    // Mountain Lodge may not have an entry yet - that's OK
    // The test will handle the case where it doesn't exist
  });
});
