import type { PluginAPI } from '@campops/plugin-sdk';

/**
 * test-probe plugin
 *
 * Minimal probe plugin for verifying core framework integration points:
 *   - Plugin lifecycle (init/teardown)
 *   - DB table creation and scoped access
 *   - API route registration via registerRoute
 *   - UI slot and menu item registration
 *   - Hook registration and execution
 *   - Multi-tenant data isolation
 */
export async function init(api: PluginAPI) {
  api.logger.info('test-probe: initializing');

  // ── 1. DB: create a scoped probe table (idempotent) ───────────────────────
  await api.db.createTable(
    'probes',
    `
    key   TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT ''
  `
  );

  // ── 2. Routes ────────────────────────────────────────────────────────────────

  /** GET /api/test-probe/ping — health check, returns plugin metadata */
  api.registerRoute('/api/test-probe/ping', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const slug = url.searchParams.get('slug') ?? null;
      return new Response(
        JSON.stringify({
          ok: true,
          plugin: api.pluginId,
          tenant: slug,
          table: 'plugin_test_probe_probes',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  /** POST /api/test-probe/echo — fires a hook, writes a probe row, echoes body */
  api.registerRoute('/api/test-probe/echo', async (req: Request) => {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? null;
    const body = await req.json().catch(() => ({}));

    // Write a probe row — store slug in value JSON for tenant isolation checks
    const payload = JSON.stringify({ ...body, _tenant: slug ?? 'none' });
    await api.db.execute(`INSERT INTO plugin_test_probe_probes (key, value) VALUES ('echo', ?)`, [
      payload,
    ]);

    // Fire a hook so listeners can intercept
    await api.hooks.executeHook('test-probe.echo', { body, propertyId: slug });

    return new Response(JSON.stringify({ ok: true, echo: body, tenant: slug }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  /** GET /api/test-probe/rows — returns all probe rows for the current tenant */
  api.registerRoute('/api/test-probe/rows', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const slug = url.searchParams.get('slug') ?? null;
      // All rows — tenant isolation is checked by the test via value JSON content
      const rows = await api.db.query(
        `SELECT * FROM plugin_test_probe_probes WHERE key = 'echo'${slug ? ` AND value LIKE ?` : ''}`,
        slug ? [`%"_tenant":"${slug}"%`] : []
      );
      return new Response(JSON.stringify({ rows, tenant: slug }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  // ── 3. Hooks ─────────────────────────────────────────────────────────────────
  api.hooks.registerHook(
    'test-probe.echo',
    async (data: { body: unknown; propertyId: string | undefined }) => {
      api.logger.info('test-probe.echo hook fired', data);
      return data;
    },
    10
  );

  // ── 4. UI ────────────────────────────────────────────────────────────────────
  api.ui.registerMenuItem?.({
    label: 'Test Probe',
    path: '/admin/test-probe',
  });

  api.ui.registerSlot?.('DASHBOARD_WIDGETS', 'test-probe:ProbeWidget');
  api.ui.addSlotComponent?.('listing.sidebar', 'test-probe:ProbeSidebarWidget');

  api.logger.info('test-probe: ready');
}

export default init;
