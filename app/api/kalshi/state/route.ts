import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createIfMissing } from "@/db/users";
import { createSupabaseServerClient } from "@/db/supabase/server";

export const runtime = "nodejs";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: internalUserId } = await createIfMissing(userId);
  const { searchParams } = new URL(req.url);
  const ticker = String(searchParams.get("ticker") ?? "").trim();
  if (!ticker) return NextResponse.json({ error: "ticker is required" }, { status: 400 });

  const supabase = createSupabaseServerClient();

  const [balanceRes, positionsRes, ordersRes, syncRes] = await Promise.all([
    supabase
      .from("trading_balances_current")
      .select("asset_id, balance, updated_at")
      .eq("user_id", internalUserId)
      .eq("provider", "kalshi")
      .eq("asset_id", "USD")
      .maybeSingle(),
    supabase
      .from("trading_positions_current")
      .select("token_id, outcome, shares, avg_price, current_price, value, pnl, pnl_pct, updated_at")
      .eq("user_id", internalUserId)
      .eq("provider", "kalshi")
      .like("token_id", `${ticker}:%`)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("trading_orders_current")
      .select("order_id, token_id, side, price, size, status, created_at, last_seen_at")
      .eq("user_id", internalUserId)
      .eq("provider", "kalshi")
      .like("token_id", `${ticker}:%`)
      .order("last_seen_at", { ascending: false })
      .limit(50),
    supabase
      .from("trading_sync_runs")
      .select("status, started_at, finished_at, error")
      .eq("user_id", internalUserId)
      .eq("provider", "kalshi")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const balanceRow = asRecord(balanceRes.data);
  const usd = balanceRow
    ? {
        balance: toNumber(balanceRow.balance),
        updated_at: String(balanceRow.updated_at ?? ""),
      }
    : null;

  const positions = (Array.isArray(positionsRes.data) ? positionsRes.data : []).map((row) => {
    const r = asRecord(row) ?? {};
    return {
      token_id: String(r.token_id ?? ""),
      outcome: r.outcome == null ? null : String(r.outcome),
      shares: toNumber(r.shares) ?? 0,
      avg_price: toNumber(r.avg_price),
      current_price: toNumber(r.current_price),
      value: toNumber(r.value),
      pnl: toNumber(r.pnl),
      pnl_pct: toNumber(r.pnl_pct),
      updated_at: String(r.updated_at ?? ""),
    };
  });

  const orders = (Array.isArray(ordersRes.data) ? ordersRes.data : []).map((row) => {
    const r = asRecord(row) ?? {};
    return {
      order_id: String(r.order_id ?? ""),
      token_id: r.token_id == null ? null : String(r.token_id),
      side: r.side == null ? null : String(r.side),
      price: toNumber(r.price),
      size: toNumber(r.size),
      status: r.status == null ? null : String(r.status),
      created_at: r.created_at == null ? null : String(r.created_at),
      last_seen_at: String(r.last_seen_at ?? ""),
    };
  });

  const syncRow = asRecord(syncRes.data);
  const sync = syncRow
    ? {
        status: String(syncRow.status ?? ""),
        started_at: String(syncRow.started_at ?? ""),
        finished_at: asString(syncRow.finished_at),
        error: asString(syncRow.error),
      }
    : null;

  return NextResponse.json({ ok: true, ticker, usd, positions, orders, sync });
}
