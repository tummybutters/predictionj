-- 0002_bootstrap_fix.sql
-- Brings an older schema (with public.app_users) up to date with the current app code.
-- Safe to run multiple times.

begin;

-- 1) Align "users" table name with app expectations.
do $$
begin
  if to_regclass('public.app_users') is not null and to_regclass('public.users') is null then
    alter table public.app_users rename to users;
  end if;
end
$$;

-- 2) Ensure user_id foreign keys point at public.users(id).
alter table public.journal_entries
  drop constraint if exists journal_entries_user_id_fkey,
  add constraint journal_entries_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

alter table public.beliefs
  drop constraint if exists beliefs_user_id_fkey,
  add constraint beliefs_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

alter table public.predictions
  drop constraint if exists predictions_user_id_fkey,
  add constraint predictions_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

alter table public.tags
  drop constraint if exists tags_user_id_fkey,
  add constraint tags_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

-- 3) Add new columns used by the current UI.
alter table public.journal_entries
  add column if not exists title text;

alter table public.predictions
  add column if not exists resolution_note text;

commit;

