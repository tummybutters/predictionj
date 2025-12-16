-- 0004_prediction_terminal.sql
-- Paper prediction-market "terminal": reference line + forecast timeline + paper positions + account ledger.

begin;

-- ---------------------------------------------------------------------------
-- Predictions: add a static reference line (a "market snapshot" / prior).
-- ---------------------------------------------------------------------------
alter table public.predictions
  add column if not exists reference_line numeric(5,4) not null default 0.5;

do $$
begin
  alter table public.predictions
    add constraint predictions_reference_line_range check (reference_line >= 0 and reference_line <= 1);
exception
  when duplicate_object then null;
end
$$;

comment on column public.predictions.reference_line is 'Static reference probability used as a betting line (not dynamically priced).';

-- ---------------------------------------------------------------------------
-- Paper accounts
-- ---------------------------------------------------------------------------
create table if not exists public.paper_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance numeric(14,2) not null default 1000,
  starting_balance numeric(14,2) not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paper_accounts_balance_non_negative check (balance >= 0),
  constraint paper_accounts_starting_balance_positive check (starting_balance > 0)
);

comment on table public.paper_accounts is 'Paper trading account for predictions (no real money).';

create trigger paper_accounts_set_updated_at
before update on public.paper_accounts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Forecast history (research trail)
-- ---------------------------------------------------------------------------
create table if not exists public.prediction_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  probability numeric(5,4) not null,
  note text null,
  created_at timestamptz not null default now(),
  constraint prediction_forecasts_probability_range check (probability >= 0 and probability <= 1)
);

comment on table public.prediction_forecasts is 'Time-series of probability updates (the core journaling signal).';

create index if not exists prediction_forecasts_user_id_created_at_idx
  on public.prediction_forecasts (user_id, created_at desc);

create index if not exists prediction_forecasts_prediction_id_created_at_idx
  on public.prediction_forecasts (prediction_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Paper positions (fixed-odds against the static line)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.paper_position_side as enum ('yes', 'no');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  side public.paper_position_side not null,
  stake numeric(14,2) not null,
  line numeric(5,4) not null,
  opened_at timestamptz not null default now(),
  settled_at timestamptz null,
  outcome public.prediction_outcome null,
  payout numeric(14,2) null,
  pnl numeric(14,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paper_positions_stake_positive check (stake > 0),
  constraint paper_positions_line_range check (line > 0 and line < 1),
  constraint paper_positions_settlement_consistency check (
    (settled_at is null and outcome is null and payout is null and pnl is null) or
    (settled_at is not null and outcome is not null and payout is not null and pnl is not null)
  )
);

comment on table public.paper_positions is 'Paper trades (fixed odds vs the reference line snapshot).';

create index if not exists paper_positions_user_id_opened_at_idx
  on public.paper_positions (user_id, opened_at desc);

create index if not exists paper_positions_user_id_prediction_id_idx
  on public.paper_positions (user_id, prediction_id);

create index if not exists paper_positions_user_id_settled_at_idx
  on public.paper_positions (user_id, settled_at);

create trigger paper_positions_set_updated_at
before update on public.paper_positions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Paper ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.paper_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_id uuid null references public.predictions(id) on delete set null,
  kind text not null,
  delta numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  memo text null,
  created_at timestamptz not null default now()
);

comment on table public.paper_ledger is 'Append-only ledger of paper account balance changes.';

create index if not exists paper_ledger_user_id_created_at_idx
  on public.paper_ledger (user_id, created_at desc);

create index if not exists paper_ledger_user_id_prediction_id_idx
  on public.paper_ledger (user_id, prediction_id);

-- ---------------------------------------------------------------------------
-- Backfill: seed forecast history for existing predictions.
-- ---------------------------------------------------------------------------
insert into public.prediction_forecasts (user_id, prediction_id, probability, note, created_at)
select p.user_id, p.id, p.confidence, null, p.created_at
from public.predictions p
where not exists (
  select 1 from public.prediction_forecasts f where f.prediction_id = p.id
);

commit;

