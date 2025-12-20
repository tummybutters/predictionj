-- 0005_kalshi_security.sql (schema_v2)
-- Store Kalshi private keys encrypted at rest (server-side only).

begin;

alter table if exists public.kalshi_accounts
  add column if not exists rsa_private_key_enc text null;

-- Allow wiping plaintext keys after migration to encrypted storage.
alter table if exists public.kalshi_accounts
  alter column rsa_private_key drop not null;

commit;

