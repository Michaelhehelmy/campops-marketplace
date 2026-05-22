# Non-Negotiable Safety Rules

These rules apply to ALL agents in this workspace. Never violate them.

## Database Safety
- NEVER write raw SQL strings in application code — use Drizzle ORM
- NEVER use `DROP TABLE` without explicit user confirmation
- ALWAYS use `IF NOT EXISTS` in all `CREATE TABLE` and `CREATE INDEX` statements
- EVERY schema change requires a migration file in `src/db/migrations/`
- ALWAYS scope queries by `site_id` or `property_id` — cross-tenant data leaks are a critical security failure

## Code Safety
- NEVER hardcode `'sinaicamps.com'` as a string literal — use `process.env.NEXT_PUBLIC_BASE_DOMAIN`
- NEVER hardcode business fields (`price`, `amenities`, `capacity`) in core or themes
- NEVER call plugin code directly from core — use `doAction` / `applyFilters` hooks

## Test Safety
- NEVER skip a failing test — fix the root cause
- NEVER commit with failing tests
- Run `npm run test` before marking any task complete

## Commit Safety
- NEVER commit: `*.log`, `*.db`, `test-results/`, `playwright-report/`, `screenshots/`, `.env`, `.env.production`
- NEVER commit secrets, API keys, or credentials of any kind

## Deploy Safety
- NEVER push directly to `main` if tests are failing
- ALWAYS verify `pm2 list` shows `sinaicamps` as `online` after deploy
- If PM2 shows `errored`: check `pm2 logs sinaicamps --lines 50` before anything else
