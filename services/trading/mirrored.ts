import "server-only";

import { getKalshiAccount } from "@/db/kalshi_accounts";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { ensureUser } from "@/services/auth/ensure-user";
import {
  listPortfolioSnapshots,
  listPositionsCurrent,
  type TradingProvider,
} from "@/db/trading_mirror";
import type { PortfolioData, PortfolioPosition } from "@/services/trading/portfolio";
import { createSupabaseServerClient } from "@/db/supabase/server";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getMirroredPortfolioData(options?: {
  maxAgeSeconds?: number;
}): Promise<(PortfolioData & { mirrored: boolean })> {
  const ensured = await ensureUser();

  const [poly, kalshi] = await Promise.all([
    getPolymarketAccount(ensured.user_id).catch(() => null),
    getKalshiAccount(ensured.user_id).catch(() => null),
  ]);

  const provider: TradingProvider | null = poly ? "polymarket" : kalshi ? "kalshi" : null;
  if (!provider) {
    return {
      mirrored: true,
      provider: null,
      cash_balance: null,
      total_value: null,
      pnl_24h: null,
      pnl_24h_pct: null,
      performance_30d: [],
      positions: [],
      suggested: [],
    };
  }

  // Ensure the data is fresh enough
  const supabase = createSupabaseServerClient();
  const { data: latestRow } = await supabase
    .from("trading_portfolio_snapshots")
    .select("captured_at, total_value, cash_balance")
    .eq("user_id", ensured.user_id)
    .eq("provider", provider)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRow) {
    return {
      mirrored: false,
      provider,
      cash_balance: null,
      total_value: null,
      pnl_24h: null,
      pnl_24h_pct: null,
      performance_30d: [],
      positions: [],
      suggested: [],
    };
  }

  const maxAgeSeconds = options?.maxAgeSeconds ?? 90;
  const capturedAt = Date.parse(String((latestRow as any).captured_at ?? ""));
  const ageSeconds = Number.isFinite(capturedAt) ? (Date.now() - capturedAt) / 1000 : Infinity;
  if (ageSeconds > maxAgeSeconds) {
    return {
      mirrored: false,
      provider,
      cash_balance: toNumber((latestRow as any).cash_balance),
      total_value: toNumber((latestRow as any).total_value),
      pnl_24h: null,
      pnl_24h_pct: null,
      performance_30d: [],
      positions: [],
      suggested: [],
    };
  }

  const positionsCurrent = await listPositionsCurrent({
    userId: ensured.user_id,
    provider,
    limit: 140,
  });

  const positions: PortfolioPosition[] = positionsCurrent.map((p) => ({
    provider,
    market_slug: p.market_slug,
    market_question: p.market_question,
    outcome: p.outcome,
    token_id: p.token_id,
    shares: toNumber(p.shares) ?? 0,
    avg_price: toNumber(p.avg_price),
    current_price: toNumber(p.current_price),
    pnl: toNumber(p.pnl),
    pnl_pct: toNumber(p.pnl_pct),
    value: toNumber(p.value),
  }));

  const performance_30d = await listPortfolioSnapshots({
    userId: ensured.user_id,
    provider,
    limit: 80,
  });

  return {
    mirrored: true,
    provider,
    cash_balance: toNumber((latestRow as any).cash_balance),
    total_value: toNumber((latestRow as any).total_value),
    pnl_24h: null,
    pnl_24h_pct: null,
    performance_30d,
    positions,
    suggested: [],
  };
}

