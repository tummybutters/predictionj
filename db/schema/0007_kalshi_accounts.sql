-- 0007_kalshi_accounts.sql
-- Storage for Kalshi API credentials.

begin;

create table if not exists public.kalshi_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  key_id uuid not null,
  rsa_private_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kalshi_accounts is 'Stores API credentials for Kalshi integration.';

create trigger kalshi_accounts_set_updated_at
before update on public.kalshi_accounts
for each row execute function public.set_updated_at();

commit;
