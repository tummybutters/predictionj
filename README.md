Production-ready foundation for a modular Next.js 14 App Router codebase.

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

- `app/`: routing and UI composition only
- `components/`: UI components only (no business logic)
- `db/`: schema + queries only (data access boundary)
- `services/`: business logic (no direct DB access)
- `lib/`: pure utilities (no side effects)

## Notes

- Clerk is wired via `middleware.ts` and `app/layout.tsx`.
- Supabase is configured as server-only in `db/supabase/server.ts`.

This repo intentionally contains no product features yet.
