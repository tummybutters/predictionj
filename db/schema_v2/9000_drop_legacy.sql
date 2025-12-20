-- 9000_drop_legacy.sql (schema_v2)
-- Optional cleanup: drop legacy tables from the pre–truth-objects era.
--
-- Run ONLY after you have migrated anything you want to keep into `truth_objects`.
-- This is intentionally aggressive to keep the database aligned with the v2 mental model.

begin;

-- Legacy joins / tags / old object tables
drop table if exists public.journal_entry_predictions cascade;
drop table if exists public.journal_entry_beliefs cascade;
drop table if exists public.journal_entry_tags cascade;
drop table if exists public.belief_tags cascade;
drop table if exists public.prediction_beliefs cascade;
drop table if exists public.prediction_tags cascade;

drop table if exists public.tags cascade;
drop table if exists public.journal_entries cascade;
drop table if exists public.beliefs cascade;
drop table if exists public.predictions cascade;
drop table if exists public.prediction_forecasts cascade;
drop table if exists public.prediction_bets cascade;

-- Legacy paper trading / bankroll
drop table if exists public.paper_ledger cascade;
drop table if exists public.paper_positions cascade;
drop table if exists public.paper_accounts cascade;
drop table if exists public.user_bankroll cascade;
drop table if exists public.bankroll_transactions cascade;

commit;

