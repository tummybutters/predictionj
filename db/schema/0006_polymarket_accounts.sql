-- 0006_polymarket_accounts.sql
-- Storage for Polymarket CLOB L2 credentials and proxy information.

begin;

create table if not exists public.polymarket_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  poly_address text not null,
  api_key uuid not null,
  api_secret text not null,
  api_passphrase text not null,
  proxy_address text null, -- funder address
  signature_type integer not null default 0, -- 0=EOA, 1=POLY_PROXY, 2=GNOSIS_SAFE
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.polymarket_accounts is 'Stores L2 API credentials for Polymarket CLOB integration.';

create trigger polymarket_accounts_set_updated_at
before update on public.polymarket_accounts
for each row execute function public.set_updated_at();

commit;
