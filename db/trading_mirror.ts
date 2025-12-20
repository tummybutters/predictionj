import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type TradingProvider = "polymarket" | "kalshi";
export type TradingSyncStatus = "running" | "success" | "error";

export type TradingSyncRunRow = {
  id: string;
  user_id: string;
  provider: TradingProvider;
  status: TradingSyncStatus;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  meta: Record<string, unknown>;
};

export type TradingBalanceCurrentRow = {
  user_id: string;
  provider: TradingProvider;
  asset_id: string;
  balance: number | null;
  updated_at: string;
  raw: Record<string, unknown>;
};

export type TradingPositionCurrentRow = {
  user_id: string;
  provider: TradingProvider;
  token_id: string;
  market_slug: string | null;
  market_question: string;
  outcome: string | null;
  shares: number;
  avg_price: number | null;
  current_price: number | null;
  value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  updated_at: string;
  raw: Record<string, unknown>;
};

export type TradingOrderCurrentRow = {
  user_id: string;
  provider: TradingProvider;
  order_id: string;
  token_id: string | null;
  side: string | null;
  price: number | null;
  size: number | null;
  status: string | null;
  created_at: string | null;
  last_seen_at: string;
  raw: Record<string, unknown>;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function startSyncRun(input: {
  userId: string;
  provider: TradingProvider;
  meta?: Record<string, unknown>;
}): Promise<TradingSyncRunRow> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_sync_runs")
    .insert({
      user_id: input.userId,
      provider: input.provider,
      status: "running",
      meta: input.meta ?? {},
    })
    .select("id, user_id, provider, status, started_at, finished_at, error, meta")
    .single();
  if (error) throw error;
  return data as TradingSyncRunRow;
}

export async function finishSyncRun(input: {
  userId: string;
  runId: string;
  status: TradingSyncStatus;
  error?: string | null;
  metaPatch?: Record<string, unknown>;
}): Promise<TradingSyncRunRow | null> {
  const supabase = createSupabaseServerClient();

  const patch: Record<string, unknown> = {
    status: input.status,
    finished_at: new Date().toISOString(),
  };
  if (input.error !== undefined) patch.error = input.error;
  if (input.metaPatch) patch.meta = input.metaPatch;

  const { data, error } = await supabase
    .from("trading_sync_runs")
    .update(patch)
    .eq("user_id", input.userId)
    .eq("id", input.runId)
    .select("id, user_id, provider, status, started_at, finished_at, error, meta")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TradingSyncRunRow | null;
}

export async function getLatestSyncRun(
  userId: string,
  provider: TradingProvider,
): Promise<TradingSyncRunRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_sync_runs")
    .select("id, user_id, provider, status, started_at, finished_at, error, meta")
    .eq("user_id", userId)
    .eq("provider", provider)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TradingSyncRunRow | null;
}

export async function upsertBalancesCurrent(input: {
  userId: string;
  provider: TradingProvider;
  balances: Array<{ asset_id: string; balance: number | null; raw?: Record<string, unknown> }>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = input.balances.map((b) => ({
    user_id: input.userId,
    provider: input.provider,
    asset_id: b.asset_id,
    balance: b.balance,
    updated_at: now,
    raw: b.raw ?? {},
  }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("trading_balances_current")
    .upsert(rows, { onConflict: "user_id,provider,asset_id" });
  if (error) throw error;
}

export async function insertBalanceSnapshots(input: {
  runId: string;
  userId: string;
  provider: TradingProvider;
  balances: Array<{ asset_id: string; balance: number | null; raw?: Record<string, unknown> }>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const rows = input.balances.map((b) => ({
    sync_run_id: input.runId,
    user_id: input.userId,
    provider: input.provider,
    asset_id: b.asset_id,
    balance: b.balance,
    raw: b.raw ?? {},
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("trading_balance_snapshots").insert(rows);
  if (error) throw error;
}

export async function insertPortfolioSnapshot(input: {
  runId: string;
  userId: string;
  provider: TradingProvider;
  cash_balance: number | null;
  positions_value: number | null;
  total_value: number | null;
  raw?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("trading_portfolio_snapshots").insert({
    sync_run_id: input.runId,
    user_id: input.userId,
    provider: input.provider,
    cash_balance: input.cash_balance,
    positions_value: input.positions_value,
    total_value: input.total_value,
    raw: input.raw ?? {},
  });
  if (error) throw error;
}

export async function listPortfolioSnapshots(input: {
  userId: string;
  provider: TradingProvider;
  limit?: number;
}): Promise<Array<{ t: number; v: number }>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_portfolio_snapshots")
    .select("captured_at, total_value")
    .eq("user_id", input.userId)
    .eq("provider", input.provider)
    .order("captured_at", { ascending: false })
    .limit(input.limit ?? 120);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ captured_at: string; total_value: unknown }>;
  const points: Array<{ t: number; v: number }> = [];
  for (const r of rows) {
    const ts = Date.parse(r.captured_at);
    const v = toNumber(r.total_value);
    if (!Number.isFinite(ts) || v == null) continue;
    points.push({ t: Math.floor(ts / 1000), v });
  }
  return points.reverse();
}

export async function replacePositionsCurrent(input: {
  userId: string;
  provider: TradingProvider;
  positions: Array<
    Omit<
      TradingPositionCurrentRow,
      "user_id" | "provider" | "updated_at" | "raw"
    > & { raw?: Record<string, unknown> }
  >;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  // Clear current rows for provider, then insert fresh. This makes “mirror == provider state” exact.
  const { error: delErr } = await supabase
    .from("trading_positions_current")
    .delete()
    .eq("user_id", input.userId)
    .eq("provider", input.provider);
  if (delErr) throw delErr;

  const rows = input.positions.map((p) => ({
    user_id: input.userId,
    provider: input.provider,
    token_id: p.token_id,
    market_slug: p.market_slug ?? null,
    market_question: p.market_question ?? "",
    outcome: p.outcome ?? null,
    shares: p.shares ?? 0,
    avg_price: p.avg_price ?? null,
    current_price: p.current_price ?? null,
    value: p.value ?? null,
    pnl: p.pnl ?? null,
    pnl_pct: p.pnl_pct ?? null,
    updated_at: now,
    raw: p.raw ?? {},
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("trading_positions_current").insert(rows);
  if (error) throw error;
}

export async function insertPositionSnapshots(input: {
  runId: string;
  userId: string;
  provider: TradingProvider;
  positions: Array<{ token_id: string; shares: number; price: number | null; value: number | null; raw?: Record<string, unknown> }>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const rows = input.positions.map((p) => ({
    sync_run_id: input.runId,
    user_id: input.userId,
    provider: input.provider,
    token_id: p.token_id,
    shares: p.shares,
    price: p.price,
    value: p.value,
    raw: p.raw ?? {},
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("trading_position_snapshots").insert(rows);
  if (error) throw error;
}

export async function replaceOrdersCurrent(input: {
  userId: string;
  provider: TradingProvider;
  orders: Array<{
    order_id: string;
    token_id?: string | null;
    side?: string | null;
    price?: number | null;
    size?: number | null;
    status?: string | null;
    created_at?: string | null;
    raw?: Record<string, unknown>;
  }>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { error: delErr } = await supabase
    .from("trading_orders_current")
    .delete()
    .eq("user_id", input.userId)
    .eq("provider", input.provider);
  if (delErr) throw delErr;

  const rows = input.orders
    .map((o) => ({
      user_id: input.userId,
      provider: input.provider,
      order_id: o.order_id,
      token_id: o.token_id ?? null,
      side: o.side ?? null,
      price: o.price ?? null,
      size: o.size ?? null,
      status: o.status ?? null,
      created_at: o.created_at ?? null,
      last_seen_at: now,
      raw: o.raw ?? {},
    }))
    .filter((o) => o.order_id);
  if (rows.length === 0) return;
  const { error } = await supabase.from("trading_orders_current").insert(rows);
  if (error) throw error;
}

export async function logTradingAction(input: {
  userId: string;
  provider: TradingProvider;
  action_type: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("trading_actions").insert({
    user_id: input.userId,
    provider: input.provider,
    action_type: input.action_type,
    request: input.request ?? {},
    response: input.response ?? {},
  });
  if (error) throw error;
}

export async function listPositionsCurrent(input: {
  userId: string;
  provider: TradingProvider;
  limit?: number;
}): Promise<TradingPositionCurrentRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_positions_current")
    .select(
      "user_id, provider, token_id, market_slug, market_question, outcome, shares, avg_price, current_price, value, pnl, pnl_pct, updated_at, raw",
    )
    .eq("user_id", input.userId)
    .eq("provider", input.provider)
    .order("value", { ascending: false })
    .limit(input.limit ?? 200);
  if (error) throw error;
  return (data ?? []) as TradingPositionCurrentRow[];
}

export async function listRecentActions(input: {
  userId: string;
  provider: TradingProvider;
  limit?: number;
}): Promise<Array<{ action_type: string; created_at: string; request: unknown; response: unknown }>> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_actions")
    .select("action_type, created_at, request, response")
    .eq("user_id", input.userId)
    .eq("provider", input.provider)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 30);
  if (error) throw error;
  return (data ?? []) as Array<{
    action_type: string;
    created_at: string;
    request: unknown;
    response: unknown;
  }>;
}

export async function buildAiPortfolioContext(userId: string): Promise<string> {
  const supabase = createSupabaseServerClient();
  const providers: TradingProvider[] = ["polymarket", "kalshi"];

  const parts: string[] = [];
  for (const provider of providers) {
    let positions: TradingPositionCurrentRow[] = [];
    try {
      const { data } = await supabase
        .from("trading_positions_current")
        .select("token_id, market_question, outcome, shares, current_price, value, updated_at")
        .eq("user_id", userId)
        .eq("provider", provider)
        .order("value", { ascending: false })
        .limit(8);
      positions = (data ?? []) as unknown as TradingPositionCurrentRow[];
    } catch {
      positions = [];
    }
    if (!positions.length) continue;

    const lines = positions.map((p) => {
      const v = toNumber(p.value);
      const price = toNumber(p.current_price);
      const shares = toNumber(p.shares) ?? 0;
      const o = p.outcome ? ` (${p.outcome})` : "";
      return `- ${p.market_question || p.token_id}${o}: ${shares} @ ${price ?? "?"} (value ${v ?? "?"})`;
    });
    parts.push(`# ${provider} portfolio\n${lines.join("\n")}`);
  }

  return parts.join("\n\n").trim();
}
