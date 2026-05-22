---
name: db-migration
description: Create and apply a database migration safely
---

## When to use
When the user needs to add a column, create a table, or modify the schema.

## Steps

1. **Create migration file**
   ```bash
   # Name it sequentially: 001, 002, 003...
   touch src/db/migrations/0XX_describe_change.sql
   ```

2. **Write the SQL** — use `IF NOT EXISTS` / `IF NOT EXISTS` guards:
   ```sql
   -- 0XX_add_column_example.sql
   ALTER TABLE properties ADD COLUMN new_field TEXT;
   CREATE INDEX IF NOT EXISTS idx_properties_new_field ON properties(new_field);
   ```

3. **Register migration** in `src/lib/db.ts` migration runner array

4. **Update TypeScript types** in the relevant schema/type files

5. **Update Drizzle schema** if using Drizzle ORM

6. **Test**: run `npm run test` to ensure nothing broke

7. **Verify with sqlite MCP**: query the table to confirm column exists

## Rules
- NEVER run `DROP TABLE` without explicit user confirmation
- Always use `IF NOT EXISTS` for `CREATE TABLE` and `CREATE INDEX`
- Always add a migration — never mutate schema in application startup code
- Column rename requires: add new column → migrate data → drop old column (3 migrations)
