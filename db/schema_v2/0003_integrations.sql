-- 0003_integrations.sql (schema_v2)
-- External account integrations used by Markets/Portfolio.

begin;

-- Polymarket CLOB credentials (stored server-side; never expose to clients).
create table if not exists public.polymarket_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  poly_address text not null,
  api_key text not null,
  api_secret text not null,
  api_passphrase text not null,
  proxy_address text null,
  signature_type integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polymarket_accounts_user_id_idx
  on public.polymarket_accounts (user_id);

drop trigger if exists polymarket_accounts_set_updated_at on public.polymarket_accounts;
create trigger polymarket_accounts_set_updated_at
before update on public.polymarket_accounts
for each row execute function public.set_updated_at();

-- Kalshi API credentials (stored server-side; never expose to clients).
create table if not exists public.kalshi_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  key_id text not null,
  rsa_private_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kalshi_accounts_user_id_idx
  on public.kalshi_accounts (user_id);

drop trigger if exists kalshi_accounts_set_updated_at on public.kalshi_accounts;
create trigger kalshi_accounts_set_updated_at
before update on public.kalshi_accounts
for each row execute function public.set_updated_at();

commit;
