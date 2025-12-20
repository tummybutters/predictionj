-- 0004_trading_mirror.sql (schema_v2)
-- Provider-agnostic storage for mirroring external prediction-market accounts.
--
-- Goals:
-- - Persist current holdings + balances + open orders (for fast UI + AI grounding)
-- - Persist periodic snapshots (for history, analytics, and “perfect mirror”)
-- - Keep provider-specific payloads in `raw` JSON where needed (don’t over-model)

begin;

do $$
begin
  create type public.trading_provider as enum ('polymarket', 'kalshi');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.trading_sync_status as enum ('running', 'success', 'error');
exception
  when duplicate_object then null;
end
$$;

-- Extend integrations to support trading (Polymarket requires a private key to sign orders).
alter table if exists public.polymarket_accounts
  add column if not exists private_key_enc text null;

-- Sync runs (audit + debugging)
create table if not exists public.trading_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  status public.trading_sync_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  error text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists trading_sync_runs_user_provider_started_idx
  on public.trading_sync_runs (user_id, provider, started_at desc);

-- Current balances (cash + collateral + etc)
create table if not exists public.trading_balances_current (
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  asset_id text not null,
  balance numeric null,
  updated_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  primary key (user_id, provider, asset_id)
);

-- Current positions (one row per held contract/outcome token)
create table if not exists public.trading_positions_current (
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  token_id text not null,
  market_slug text null,
  market_question text not null default '',
  outcome text null,
  shares numeric not null default 0,
  avg_price numeric null,
  current_price numeric null,
  value numeric null,
  pnl numeric null,
  pnl_pct numeric null,
  updated_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  primary key (user_id, provider, token_id)
);

create index if not exists trading_positions_current_user_provider_value_idx
  on public.trading_positions_current (user_id, provider, value desc nulls last);

-- Open orders (best-effort; providers differ)
create table if not exists public.trading_orders_current (
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  order_id text not null,
  token_id text null,
  side text null,
  price numeric null,
  size numeric null,
  status text null,
  created_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  primary key (user_id, provider, order_id)
);

create index if not exists trading_orders_current_user_provider_last_seen_idx
  on public.trading_orders_current (user_id, provider, last_seen_at desc);

-- Append-only snapshots (history)
create table if not exists public.trading_position_snapshots (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid null references public.trading_sync_runs(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  token_id text not null,
  shares numeric not null default 0,
  price numeric null,
  value numeric null,
  captured_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

create index if not exists trading_position_snapshots_user_provider_captured_idx
  on public.trading_position_snapshots (user_id, provider, captured_at desc);

create table if not exists public.trading_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid null references public.trading_sync_runs(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  asset_id text not null,
  balance numeric null,
  captured_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

create index if not exists trading_balance_snapshots_user_provider_captured_idx
  on public.trading_balance_snapshots (user_id, provider, captured_at desc);

-- Aggregated portfolio snapshots (fast charting + AI grounding)
create table if not exists public.trading_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid null references public.trading_sync_runs(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  cash_balance numeric null,
  positions_value numeric null,
  total_value numeric null,
  captured_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

create index if not exists trading_portfolio_snapshots_user_provider_captured_idx
  on public.trading_portfolio_snapshots (user_id, provider, captured_at desc);

-- Local audit log of “actions” performed via the app (attempted trades, cancels, sync triggers).
create table if not exists public.trading_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.trading_provider not null,
  action_type text not null,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trading_actions_user_provider_created_idx
  on public.trading_actions (user_id, provider, created_at desc);

commit;
