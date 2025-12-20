# db/schema_v2

This folder defines the **v2 “truth objects”** schema for the app.

It is intentionally minimal:

- One unified table for user-owned objects (`truth_objects`)
- One table for links between objects (`truth_object_links`)
- A per-user `handle` on every object for `@handle` referencing

Run these SQL files in order on a fresh Supabase Postgres database.

Order:

1. `db/schema_v2/0001_core.sql`
2. `db/schema_v2/0002_truth_objects.sql`
3. `db/schema_v2/0003_integrations.sql`
4. `db/schema_v2/0004_trading_mirror.sql`
5. `db/schema_v2/0005_kalshi_security.sql`

Optional:

- `db/schema_v2/9000_drop_legacy.sql` (remove legacy tables after migrating)
