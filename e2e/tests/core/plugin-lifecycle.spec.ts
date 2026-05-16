import { test, expect } from '@playwright/test';
import { CoreProbeApiPage } from '../../pages/CoreProbeApiPage';

/**
 * Core E2E: Plugin Lifecycle
 *
 * Verifies that the framework correctly:
 *   - Registers and initialises plugins on server start
 *   - Routes requests to plugin-registered API handlers
 *   - Returns correct plugin metadata from the catch-all route
 */
test.describe('Core: Plugin Lifecycle', () => {
  let probe: CoreProbeApiPage;

  test.beforeEach(async ({ request }) => {
    probe = new CoreProbeApiPage(request);
  });

  test('test-probe /ping responds 200 with plugin metadata', async () => {
    const { status, body } = await probe.ping();
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.plugin).toBe('test-probe');
  });

  test('plugin route is reachable via the catch-all /api/[...path] handler', async ({
    request,
  }) => {
    const res = await request.get('/api/test-probe/ping');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.plugin).toBe('test-probe');
  });

  test('unknown plugin route returns 404', async ({ request }) => {
    const res = await request.get('/api/non-existent-plugin/ping');
    expect([404, 400]).toContain(res.status());
  });
});
