# db

This directory is the data layer boundary.

- Schema: what tables/types exist (migrations live elsewhere later).
- Queries: SQL/DB access only (no business rules).

CRUD repositories (server-only) live at the root (e.g. `db/journal_entries.ts`).
