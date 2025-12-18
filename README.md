Next.js 14 App Router app for a personal prediction + journaling system (Clerk auth, Supabase Postgres).

## Setup

- Copy `.env.example` to `.env.local` and fill in:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY` (for `/ai`)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Boundaries

- `app/`: routing, server actions, and UI composition
- `components/`: reusable UI components (no DB access)
- `db/`: data access boundary (Supabase queries + row normalization; server-only)
- `services/`: domain/workflow orchestration on top of `db/` (server-only)
- `lib/`: small shared utilities

## Notes

- Clerk is wired via `middleware.ts` and `app/layout.tsx`.
- Supabase is configured as server-only in `db/supabase/server.ts`.
- SQL sources live in `db/schema/` (including RPC helpers used by paper trading workflows).
- `app/dev/*` routes are intended for local development only and are blocked in production by `middleware.ts`.
