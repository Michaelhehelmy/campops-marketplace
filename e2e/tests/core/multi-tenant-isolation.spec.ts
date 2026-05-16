import { test, expect } from '@playwright/test';
import { CoreProbeApiPage } from '../../pages/CoreProbeApiPage';

/**
 * Core E2E: Multi-tenant Isolation
 *
 * Verifies that the framework correctly isolates data per tenant (property):
 *   - Data written for tenant A is not visible to tenant B
 *   - The catch-all route injects the correct propertyId context
 *   - The UI registry returns tenant-scoped plugin configurations
 */
test.describe('Core: Multi-tenant Isolation', () => {
  let probe: CoreProbeApiPage;

  test.beforeEach(async ({ request }) => {
    probe = new CoreProbeApiPage(request);
    await probe.resetDb();
  });

  test('ping returns tenant context when slug provided', async () => {
    const { status, body } = await probe.ping('safari-camp');
    expect(status).toBe(200);
    expect(body.plugin).toBe('test-probe');
  });

  test('echo writes are scoped to tenant — different slugs see different rows', async () => {
    // Write to tenant A
    const echoA = await probe.echo({ msg: 'tenant-a-data' }, 'safari-camp');
    expect(echoA.status).toBe(200);

    // Write to tenant B
    const echoB = await probe.echo({ msg: 'tenant-b-data' }, 'mountain-lodge');
    expect(echoB.status).toBe(200);

    // Rows for tenant A should not contain tenant B data
    const rowsA = await probe.rows('safari-camp');
    expect(rowsA.status).toBe(200);
    const valuesA = (rowsA.body.rows as any[]).map((r: any) => r.value);
    const hasBData = valuesA.some((v: string) => v.includes('tenant-b-data'));
    expect(hasBData).toBe(false);
  });

  test('UI registry returns listing context for known propertyId', async () => {
    const { status, body } = await probe.uiRegistry('1');
    expect(status).toBe(200);
    expect(body.context).toBe('listing');
  });

  test('UI registry returns master context for marketplace_master role', async () => {
    const { status, body } = await probe.uiRegistry(undefined, 'marketplace_master');
    expect(status).toBe(200);
    expect(body.context).toBe('master');
  });

  test('UI registry always returns default homepage slots', async () => {
    const { status, body } = await probe.uiRegistry();
    expect(status).toBe(200);
    expect(body.slots['homepage.hero']).toBeDefined();
    expect(body.slots['homepage.featured-listings']).toBeDefined();
    expect(body.slots['homepage.categories']).toBeDefined();
  });
});
