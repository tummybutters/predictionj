-- 0003_dummy_polymarket_account.sql
-- Adds a dummy Polymarket-style bankroll + betting layer for predictions.

begin;

-- ---------------------------------------------------------------------------
-- Bankroll (virtual credits)
-- ---------------------------------------------------------------------------
create table if not exists public.user_bankroll (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance numeric(14,2) not null default 1000,
  starting_balance numeric(14,2) not null default 1000,
  bust_count integer not null default 0,
  all_time_high numeric(14,2) not null default 1000,
  last_bust_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_bankroll_balance_non_negative check (balance >= 0),
  constraint user_bankroll_starting_balance_positive check (starting_balance > 0)
);

comment on table public.user_bankroll is 'Virtual credits account for dummy Polymarket-style wagering.';

create trigger user_bankroll_set_updated_at
before update on public.user_bankroll
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bets (one open bet per user per prediction)
-- ---------------------------------------------------------------------------
create table if not exists public.prediction_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  stake numeric(14,2) not null,
  -- Confidence captured at bet time (probability in [0, 1]).
  confidence numeric(5,4) not null,
  placed_at timestamptz not null default now(),
  settled_at timestamptz null,
  outcome public.prediction_outcome null,
  pnl numeric(14,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_bets_user_prediction_unique unique (user_id, prediction_id),
  constraint prediction_bets_stake_positive check (stake > 0),
  constraint prediction_bets_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint prediction_bets_settlement_consistency check (
    (settled_at is null and outcome is null and pnl is null) or
    (settled_at is not null and outcome is not null and pnl is not null)
  )
);

comment on table public.prediction_bets is 'User wagers on predictions using a wagered scoring rule.';

create index if not exists prediction_bets_user_id_placed_at_idx
  on public.prediction_bets (user_id, placed_at desc);

create index if not exists prediction_bets_user_id_prediction_id_idx
  on public.prediction_bets (user_id, prediction_id);

create index if not exists prediction_bets_user_id_settled_at_idx
  on public.prediction_bets (user_id, settled_at);

create trigger prediction_bets_set_updated_at
before update on public.prediction_bets
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ledger (optional but useful for timeline + audits)
-- ---------------------------------------------------------------------------
create table if not exists public.bankroll_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_id uuid null references public.predictions(id) on delete set null,
  kind text not null,
  delta numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  memo text null,
  created_at timestamptz not null default now()
);

comment on table public.bankroll_transactions is 'Append-only ledger of bankroll updates for debugging + analytics.';

create index if not exists bankroll_transactions_user_id_created_at_idx
  on public.bankroll_transactions (user_id, created_at desc);

create index if not exists bankroll_transactions_user_id_prediction_id_idx
  on public.bankroll_transactions (user_id, prediction_id);

commit;

