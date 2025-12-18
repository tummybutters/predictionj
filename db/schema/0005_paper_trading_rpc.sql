-- 0005_paper_trading_rpc.sql
-- Adds atomic RPC helpers for paper trading workflows (balances/positions/ledger).

begin;

-- -----------------------------------------------------------------------------
-- Open a paper position (atomic)
-- -----------------------------------------------------------------------------
create or replace function public.pj_open_paper_position(
  p_user_id uuid,
  p_prediction_id uuid,
  p_side public.paper_position_side,
  p_stake numeric
)
returns table (
  position_id uuid,
  balance_after numeric
)
language plpgsql
as $$
declare
  v_line numeric;
  v_balance numeric;
  v_next_balance numeric;
  v_position_id uuid;
begin
  if p_stake is null or p_stake <= 0 then
    raise exception 'Stake must be > 0.';
  end if;

  -- Lock the prediction row to prevent concurrent resolution while opening.
  select reference_line
    into v_line
  from public.predictions
  where user_id = p_user_id
    and id = p_prediction_id
    and resolved_at is null
    and outcome is null
  for update;

  if not found then
    raise exception 'Prediction not found or already resolved.';
  end if;

  if v_line <= 0 or v_line >= 1 then
    raise exception 'Invalid line.';
  end if;

  -- Ensure + lock account row.
  insert into public.paper_accounts (user_id, balance, starting_balance)
  values (p_user_id, 1000, 1000)
  on conflict (user_id) do nothing;

  select balance
    into v_balance
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  if p_stake > v_balance then
    raise exception 'Insufficient balance.';
  end if;

  v_next_balance := greatest(0, round(v_balance - p_stake, 2));

  update public.paper_accounts
  set balance = v_next_balance
  where user_id = p_user_id;

  insert into public.paper_positions (
    user_id,
    prediction_id,
    side,
    stake,
    line,
    opened_at
  )
  values (
    p_user_id,
    p_prediction_id,
    p_side,
    round(p_stake, 2),
    round(v_line, 4),
    now()
  )
  returning id into v_position_id;

  insert into public.paper_ledger (
    user_id,
    prediction_id,
    kind,
    delta,
    balance_after,
    memo
  )
  values (
    p_user_id,
    p_prediction_id,
    'open_position',
    -round(p_stake, 2),
    v_next_balance,
    'Opened ' || upper(p_side::text) || ' @ ' || round(v_line * 100) || '% (stake ' || round(p_stake) || ').'
  );

  position_id := v_position_id;
  balance_after := v_next_balance;
  return next;
end;
$$;

comment on function public.pj_open_paper_position(uuid, uuid, public.paper_position_side, numeric)
is 'Atomically debits paper_accounts, inserts paper_positions, and appends paper_ledger.';

-- -----------------------------------------------------------------------------
-- Resolve a prediction and settle its paper positions (atomic)
-- -----------------------------------------------------------------------------
create or replace function public.pj_resolve_prediction_and_settle_paper_positions(
  p_user_id uuid,
  p_prediction_id uuid,
  p_outcome public.prediction_outcome,
  p_note text
)
returns table (
  prediction_id uuid,
  balance_after numeric,
  settled_count integer,
  total_payout numeric
)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_balance numeric;
  v_next_balance numeric;
  v_settled_count integer := 0;
  v_total_payout numeric := 0;
  r record;
  v_price numeric;
  v_payout numeric;
  v_pnl numeric;
begin
  if p_outcome is null or (p_outcome::text <> 'true' and p_outcome::text <> 'false') then
    raise exception 'Outcome must be true or false.';
  end if;

  -- Resolve prediction (and lock it).
  update public.predictions
  set resolved_at = v_now,
      outcome = p_outcome,
      resolution_note = p_note
  where user_id = p_user_id
    and id = p_prediction_id
    and resolved_at is null
    and outcome is null
  returning id into prediction_id;

  if not found then
    raise exception 'Prediction not found or already resolved.';
  end if;

  -- Ensure + lock account row.
  insert into public.paper_accounts (user_id, balance, starting_balance)
  values (p_user_id, 1000, 1000)
  on conflict (user_id) do nothing;

  select balance
    into v_balance
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  v_next_balance := v_balance;

  for r in
    select id, side, stake, line
    from public.paper_positions
    where user_id = p_user_id
      and prediction_id = p_prediction_id
      and settled_at is null
    order by opened_at asc
    for update
  loop
    v_price := case when r.side::text = 'yes' then r.line else (1 - r.line) end;

    if v_price <= 0 then
      v_payout := 0;
    else
      v_payout := case
        when (r.side::text = 'yes' and p_outcome::text = 'true')
          or (r.side::text = 'no' and p_outcome::text = 'false')
          then r.stake / v_price
        else 0
      end;
    end if;

    v_payout := round(v_payout, 2);
    v_pnl := round(v_payout - r.stake, 2);

    update public.paper_positions
    set settled_at = v_now,
        outcome = p_outcome,
        payout = v_payout,
        pnl = v_pnl
    where id = r.id;

    v_next_balance := greatest(0, round(v_next_balance + v_payout, 2));

    insert into public.paper_ledger (
      user_id,
      prediction_id,
      kind,
      delta,
      balance_after,
      memo
    )
    values (
      p_user_id,
      p_prediction_id,
      'settle_position',
      v_payout,
      v_next_balance,
      'Settled ' || upper(r.side::text) || ' @ ' || round(r.line * 100) || '% (PnL ' || v_pnl || ').'
    );

    v_settled_count := v_settled_count + 1;
    v_total_payout := v_total_payout + v_payout;
  end loop;

  update public.paper_accounts
  set balance = v_next_balance
  where user_id = p_user_id;

  balance_after := v_next_balance;
  settled_count := v_settled_count;
  total_payout := v_total_payout;
  return next;
end;
$$;

comment on function public.pj_resolve_prediction_and_settle_paper_positions(uuid, uuid, public.prediction_outcome, text)
is 'Atomically resolves a prediction, settles open paper_positions, updates paper_accounts, and appends paper_ledger entries.';

commit;

