# Contributing

## Setup

1. Clone the repo.
2. Install dependencies:

```bash
npm install
```

This installs root dependencies and links workspace packages (`packages/plugin-sdk`, `packages/plugin-starter`, `packages/plugin-testing`, `packages/shared`).

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Start the dev server:

```bash
npm run dev
```

## Architecture Overview

CampOps Marketplace is a Next.js 14+ application with a plugin-based architecture.

### Directory Structure

```
src/
  app/
    [locale]/          – Frontend pages (i18n-routed)
    api/
      [...path]/       – Catch-all API route dispatches to plugin handlers
      auth/            – Authentication (better-auth)
      health/          – Health check
      metrics/         – Metrics endpoint
      tenant/          – Tenant resolution
      media/           – Media serving
      auth/            – Authentication (better-auth)
      health/          – Health check
      metrics/         – Metrics endpoint
      tenant/          – Tenant resolution
      media/           – Media serving
  lib/                 – Core libraries (db, auth, hooks, plugin system)
  components/          – Shared UI components
  messages/            – next-intl translation files (en.json, etc.)

plugins/
  <plugin-id>/
    package.json       – Plugin manifest with capabilities
    src/
      index.ts         – Plugin entry point (default export init function)
      routes/          – Handler files
      services/        – Business logic services

packages/
  plugin-sdk/          – TypeScript types for plugin development
  e2e-tests/           – End-to-end Playwright tests
```

### Plugin System

Plugins are discovered from `plugins/<id>/package.json` (sinaicamps section) and loaded by `PluginRuntimeService`. Each plugin exports a default `init(api: PluginAPI)` function.

Capabilities declared in `package.json` control what API features a plugin can access:

```json
{
  "sinaicamps": {
    "pluginId": "my-plugin",
    "capabilities": ["database", "hooks", "routes", "auth", "ui"]
  }
}
```

### Registering API Routes

Use `api.registerRoute(path, handlers)` where handlers is an object mapping HTTP methods to handler functions:

```typescript
api.registerRoute('/api/p/my-plugin/resource', {
  GET: async (req: Request) => {
    const data = await api.db.query('SELECT * FROM my_table');
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
```

Routes registered by plugins are dispatched through the catch-all at `src/app/api/[...path]/route.ts`.

### Route Loading

All business-logic API routes have been migrated from `src/app/api/` into plugins.
The catch-all at `src/app/api/[...path]/route.ts` dispatches to the appropriate
plugin handler at runtime.

### Developer Guides

- [Plugin Development Guide](./PLUGIN_DEVELOPER_GUIDE.md)
- [Theme Development Guide](./THEME_DEVELOPER_GUIDE.md)

## Testing

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run e2e tests (requires dev server running)
npm run test:e2e

# Run smoke tests
npm run test:smoke

# Full check (formatting + lint + tests)
npm run check
```

### Test Guidelines

- Write unit tests for route handlers using mock DB.
- Use `vi.mock('@/lib/db')` to mock the database.
- Import handlers dynamically with `const { GET } = await import('../route')`.
- For catch-all integration tests, import from `../[...path]/route` and pass `{ params: { path: [...] } }`.
- Keep tests focused on business logic, not framework behavior.

### Pre-existing Failures

The PWA service worker tests (`plugins/pwa/__tests__/sw.test.ts`) have 5 pre-existing failures due to module resolution in the test environment. These are known and acceptable.

## Code Style

- Prettier is configured – run `npm run format` before committing.
- ESLint via Next.js – run `npm run lint`.
- No commented-out code in committed files.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make changes and run `npm run check`.
3. Commit with a descriptive message matching the repo style.
4. Push and create a pull request.

## Plugin Scaffolding

To create a new plugin:

1. Copy `packages/plugin-starter/` to `plugins/<your-plugin-id>/`.
2. Update `package.json` with your plugin ID and capabilities.
3. Implement `src/index.ts` with the `init(api)` function.
4. Register routes using `api.registerRoute()`.
5. Add tests under `__tests__/`.
6. Register the plugin in the database via the admin panel or a migration.
