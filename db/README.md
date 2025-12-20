# db

This directory is the data layer boundary.

- Schema: SQL lives in `db/schema_v2/`.
- DB access only (no business rules).

CRUD repositories (server-only) live at the root (e.g. `db/truth_objects.ts`, `db/truth_object_links.ts`).
