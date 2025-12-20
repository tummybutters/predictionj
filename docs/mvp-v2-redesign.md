# MVP v2 Redesign: Truth Objects + Markets

## Vision (scope lock)

Treat everything the user writes down as compact, referenceable **truth objects** that can be linked together and grounded into an assistant.

The system centers on:

- A single object store (`truth_objects`) with `type in ('note','belief','prediction','framework','data')`
- Per-user unique `@handle` for referencing objects in UI and future command language
- A link graph (`truth_object_links`) for “this evidence supports that belief”, “this framework explains that prediction”, etc.

## Product surface (pages)

- `Home` (`/dashboard`): overview + quick actions (new prediction, view journal).
- `Markets` (`/markets`): browse/search Polymarket (and optionally Kalshi).
- `Journal` (`/journal/*`): write + curate the truth-object library.
  - Notes (`/journal`)
  - Beliefs (`/journal/beliefs`)
  - Predictions (`/journal/predictions`)
  - Frameworks (`/journal/frameworks`)
  - Data (`/journal/data`)
  - Bias Watchlist (`/journal/bias-watchlist`)
- `Overview` (`/overview`): high-level analytics/visualizations (iterative).
- `Qortana` (`/qortana`): assistant grounded in your truth objects + market context.

## Data model (Supabase)

SQL lives in `db/schema_v2/`:

1. `db/schema_v2/0001_core.sql` (extensions + `users`)
2. `db/schema_v2/0002_truth_objects.sql` (`truth_objects` + `truth_object_links`)
3. `db/schema_v2/0003_integrations.sql` (provider accounts)

### Minimal per-type shape

- `data`: title + body only (intentionally minimal; link it to anything)
- `framework`: title + body (summary/examples can live in `body` or `metadata`)
- `belief`: statement + confidence (confidence stored as 0–1 float)
- `prediction`: Polymarket-like metadata for tracking (question, outcomes, probability, close date, criteria, sources)

## Technical boundaries (keep it simple)

- `db/`: DB access only
- `services/`: multi-step workflows (trading sync, portfolio read models, etc.)
- `app/api/*`: thin HTTP wrappers over services/db
- `app/journal/*`: server actions + UI for truth objects

## Next build targets

- Link UI (create/manage `truth_object_links`)
- Assistant improvements: pull the link graph + render “objects in context”
- Prediction tracking: optional provider mapping in `metadata`, plus periodic refresh jobs later
