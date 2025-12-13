-- 0001_core.sql
-- Foundational storage schema for a personal world-model journaling + prediction system.
-- Auth is handled by Clerk (no Supabase Auth usage in this schema).

begin;

-- UUID generation (Supabase supports pgcrypto in most projects).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Timestamp helper
-- ---------------------------------------------------------------------------
-- Keeps updated_at in sync on UPDATE without app-side logic.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
-- Application users keyed by Clerk's user id.
-- Note: This is intentionally not auth.users (Supabase Auth is not used).
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Application user records keyed by Clerk user id (no auth data).';
comment on column public.users.clerk_user_id is 'Stable identifier from Clerk (e.g. user_...).';

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Journal entries
-- ---------------------------------------------------------------------------
-- Free-form, timestamped notes owned by a user.
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- Optional title for list/detail UIs; does not imply any special behavior.
  title text null,
  body text not null,
  entry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.journal_entries is 'Free-form journal entries owned by a user.';
comment on column public.journal_entries.entry_at is 'When the entry is authored/recorded (separate from created_at).';

create index if not exists journal_entries_user_id_entry_at_idx
  on public.journal_entries (user_id, entry_at desc);

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Beliefs
-- ---------------------------------------------------------------------------
-- Canonical belief statements owned by a user.
create table if not exists public.beliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  statement text not null,
  is_foundational boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beliefs_user_statement_unique unique (user_id, statement)
);

comment on table public.beliefs is 'Canonical belief statements owned by a user.';
comment on column public.beliefs.is_foundational is 'Marks core/foundational beliefs (no special behavior implied).';

create index if not exists beliefs_user_id_idx
  on public.beliefs (user_id);

create index if not exists beliefs_user_id_is_foundational_idx
  on public.beliefs (user_id, is_foundational);

create trigger beliefs_set_updated_at
before update on public.beliefs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Predictions
-- ---------------------------------------------------------------------------
-- Resolvable claims with a confidence level and (optional) resolution outcome.
do $$
begin
  create type public.prediction_outcome as enum ('true', 'false', 'unknown');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  claim text not null,
  -- Confidence as a probability in [0, 1].
  confidence numeric(5,4) not null,
  resolution_date date not null,
  resolved_at timestamptz null,
  outcome public.prediction_outcome null,
  -- Optional note attached at resolution time (no special behavior implied).
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint predictions_resolution_consistency check (
    (resolved_at is null and outcome is null) or (resolved_at is not null and outcome is not null)
  )
);

comment on table public.predictions is 'Resolvable claims owned by a user.';
comment on column public.predictions.confidence is 'Probability in [0, 1].';
comment on column public.predictions.resolution_date is 'Target date the prediction is expected to resolve by.';
comment on column public.predictions.outcome is 'Set only when resolved; unresolved predictions keep outcome NULL.';

create index if not exists predictions_user_id_resolution_date_idx
  on public.predictions (user_id, resolution_date);

create index if not exists predictions_user_id_resolved_at_idx
  on public.predictions (user_id, resolved_at);

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
-- User-scoped labels that can be attached to journals, beliefs, and predictions.
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_user_name_unique unique (user_id, name)
);

comment on table public.tags is 'User-scoped labels (e.g. tech, politics, personal).';

create index if not exists tags_user_id_idx
  on public.tags (user_id);

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Join tables (explicit many-to-many relationships)
-- ---------------------------------------------------------------------------
-- These tables exist to keep relationships normalized and queryable without JSON blobs.

-- Journal ↔ Belief
create table if not exists public.journal_entry_beliefs (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  belief_id uuid not null references public.beliefs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entry_beliefs_unique unique (journal_entry_id, belief_id)
);

comment on table public.journal_entry_beliefs is 'Links journal entries to beliefs they relate to.';

create index if not exists journal_entry_beliefs_journal_entry_id_idx
  on public.journal_entry_beliefs (journal_entry_id);

create index if not exists journal_entry_beliefs_belief_id_idx
  on public.journal_entry_beliefs (belief_id);

create trigger journal_entry_beliefs_set_updated_at
before update on public.journal_entry_beliefs
for each row execute function public.set_updated_at();

-- Journal ↔ Prediction
create table if not exists public.journal_entry_predictions (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entry_predictions_unique unique (journal_entry_id, prediction_id)
);

comment on table public.journal_entry_predictions is 'Links journal entries to predictions discussed/created/resolved.';

create index if not exists journal_entry_predictions_journal_entry_id_idx
  on public.journal_entry_predictions (journal_entry_id);

create index if not exists journal_entry_predictions_prediction_id_idx
  on public.journal_entry_predictions (prediction_id);

create trigger journal_entry_predictions_set_updated_at
before update on public.journal_entry_predictions
for each row execute function public.set_updated_at();

-- Prediction ↔ Belief
create table if not exists public.prediction_beliefs (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  belief_id uuid not null references public.beliefs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_beliefs_unique unique (prediction_id, belief_id)
);

comment on table public.prediction_beliefs is 'Links predictions to underlying beliefs that inform them.';

create index if not exists prediction_beliefs_prediction_id_idx
  on public.prediction_beliefs (prediction_id);

create index if not exists prediction_beliefs_belief_id_idx
  on public.prediction_beliefs (belief_id);

create trigger prediction_beliefs_set_updated_at
before update on public.prediction_beliefs
for each row execute function public.set_updated_at();

-- Tags applied to journals
create table if not exists public.journal_entry_tags (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entry_tags_unique unique (journal_entry_id, tag_id)
);

comment on table public.journal_entry_tags is 'Tags applied to journal entries.';

create index if not exists journal_entry_tags_journal_entry_id_idx
  on public.journal_entry_tags (journal_entry_id);

create index if not exists journal_entry_tags_tag_id_idx
  on public.journal_entry_tags (tag_id);

create trigger journal_entry_tags_set_updated_at
before update on public.journal_entry_tags
for each row execute function public.set_updated_at();

-- Tags applied to beliefs
create table if not exists public.belief_tags (
  id uuid primary key default gen_random_uuid(),
  belief_id uuid not null references public.beliefs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint belief_tags_unique unique (belief_id, tag_id)
);

comment on table public.belief_tags is 'Tags applied to beliefs.';

create index if not exists belief_tags_belief_id_idx
  on public.belief_tags (belief_id);

create index if not exists belief_tags_tag_id_idx
  on public.belief_tags (tag_id);

create trigger belief_tags_set_updated_at
before update on public.belief_tags
for each row execute function public.set_updated_at();

-- Tags applied to predictions
create table if not exists public.prediction_tags (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_tags_unique unique (prediction_id, tag_id)
);

comment on table public.prediction_tags is 'Tags applied to predictions.';

create index if not exists prediction_tags_prediction_id_idx
  on public.prediction_tags (prediction_id);

create index if not exists prediction_tags_tag_id_idx
  on public.prediction_tags (tag_id);

create trigger prediction_tags_set_updated_at
before update on public.prediction_tags
for each row execute function public.set_updated_at();

commit;
