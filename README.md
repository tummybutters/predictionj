Next.js 14 App Router app for a personal prediction + journaling system (Clerk auth, Supabase Postgres).

## Setup

- Copy `.env.example` to `.env.local` and fill in:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `AI_PROVIDER` (optional; defaults to `gemini`)
  - `GOOGLE_AI_API_KEY` (for Qortana chat)
  - `APP_ENCRYPTION_KEY` (required if storing provider private keys for trading)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

- Apply SQL in `db/schema_v2/` to your Supabase Postgres in order (see `db/schema_v2/README.md`).
- Core concept: everything is stored as linkable “truth objects” (`note`, `belief`, `prediction`, `framework`, `data`) with a per-user unique `@handle`.

## Boundaries

- `app/`: routing, server actions, and UI composition
- `components/`: reusable UI components (no DB access)
- `db/`: data access boundary (Supabase queries + row normalization; server-only)
- `services/`: domain/workflow orchestration on top of `db/` (server-only)
- `lib/`: small shared utilities

## Notes

- Clerk is wired via `middleware.ts` and `app/layout.tsx`.
- Supabase is configured as server-only in `db/supabase/server.ts`.
- SQL sources live in `db/schema_v2/`.
- `app/dev/*` routes are intended for local development only and are blocked in production by `middleware.ts`.
