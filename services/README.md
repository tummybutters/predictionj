# services

Business logic boundary.

This folder contains server-only domain/workflow logic built on top of `db/`.

- Prefer putting multi-step workflows (that must stay consistent) here.
- Keep read-model/analytics logic separate (e.g. `services/dashboard/*`, `services/analytics/*`).
