import "server-only";

import { ensureUser } from "@/services/auth/ensure-user";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { getKalshiAccount } from "@/db/kalshi_accounts";
import {
  getKalshiBalance,
  getKalshiPositionsPage,
  listKalshiMarketsByTickers,
} from "@/services/kalshi/api";
import { getClobBalances, getPricesHistory } from "@/services/polymarket/clob";
import { listMarketsByTokenIds, listTrendingEvents } from "@/services/polymarket/gamma";

type Provider = "polymarket" | "kalshi";

export type PortfolioPosition = {
  provider: Provider;
  market_slug: string | null;
  market_question: string;
  outcome: string | null;
  token_id: string;
  shares: number;
  avg_price: number | null;
  current_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  value: number | null;
};

export type PortfolioPerformancePoint = {
  t: number;
  v: number;
};

export type PortfolioSuggestedMarket = {
  event_slug: string;
  title: string;
  market_slug: string | null;
  market_question: string | null;
  yes_price: number | null;
};

export type PortfolioData = {
  provider: Provider | null;
  cash_balance: number | null;
  total_value: number | null;
  pnl_24h: number | null;
  pnl_24h_pct: number | null;
  performance_30d: PortfolioPerformancePoint[];
  positions: PortfolioPosition[];
  suggested: PortfolioSuggestedMarket[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeParseStringArray(value: string | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((v) => typeof v === "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

const POLYGON_USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";

function daysAgoTs(days: number): number {
  return Math.floor(Date.now() / 1000) - Math.trunc(days * 86_400);
}

function sampleSeriesAt(points: Array<{ t: number; p: number }>, t: number): number | null {
  if (points.length === 0) return null;
  let best: number | null = null;
  for (const pt of points) {
    if (pt.t <= t) best = pt.p;
    else break;
  }
  return best ?? points[0]!.p ?? null;
}

function isPresent<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

async function getPolymarketPortfolio(internalUserId: string): Promise<PortfolioData> {
  const balances = await getClobBalances(internalUserId);

  const cashRow = balances.find((b) => (b.asset_id ?? "").toLowerCase() === POLYGON_USDC_ADDRESS);
  const cashBalance = cashRow ? toNumber(cashRow.balance) : null;

  const tokenBalances = balances
    .map((b) => ({
      tokenId: (b.asset_id ?? "").trim(),
      balance: toNumber(b.balance) ?? 0,
    }))
    .filter((b) => b.tokenId && b.balance > 0)
    .filter((b) => b.tokenId.toLowerCase() !== POLYGON_USDC_ADDRESS)
    .slice(0, 40);

  const tokenIds = tokenBalances.map((b) => b.tokenId);
  const markets = await listMarketsByTokenIds(tokenIds);

  const positions: PortfolioPosition[] = tokenBalances.map((b) => {
    const market = markets.find((m) => {
      const ids = safeParseStringArray(m.clobTokenIds) ?? [];
      return ids.includes(b.tokenId);
    });

    const outcomes = safeParseStringArray(market?.outcomes) ?? [];
    const tokenIdList = safeParseStringArray(market?.clobTokenIds) ?? [];
    const prices = safeParseStringArray(market?.outcomePrices) ?? [];
    const idx = tokenIdList.indexOf(b.tokenId);
    const currentPrice =
      idx !== -1 && typeof prices[idx] === "string" ? toNumber(prices[idx]) : null;

    const value = currentPrice !== null ? b.balance * currentPrice : null;

    return {
      provider: "polymarket",
      market_slug: market?.slug ?? null,
      market_question: market?.question ?? market?.slug ?? b.tokenId,
      outcome: idx !== -1 ? (outcomes[idx] ?? null) : null,
      token_id: b.tokenId,
      shares: b.balance,
      avg_price: null,
      current_price: currentPrice,
      pnl: null,
      pnl_pct: null,
      value,
    };
  });

  const totalValue = (cashBalance ?? 0) + positions.reduce((sum, p) => sum + (p.value ?? 0), 0);

  // Compute an approximate 24h PnL using public prices-history sampled at now vs 24h ago,
  // assuming the current share count held throughout the window.
  const pnlByToken = new Map<string, number>();
  const pnlParts = await Promise.all(
    positions.slice(0, 12).map(async (p) => {
      try {
        const endTs = Math.floor(Date.now() / 1000);
        const startTs = endTs - 86_400;
        const hist = await getPricesHistory({ tokenId: p.token_id, startTs, endTs });
        const pts = hist.history ?? [];
        if (pts.length < 2) return 0;
        const p0 = pts[0]!.p;
        const p1 = pts[pts.length - 1]!.p;
        const pnl = (p1 - p0) * p.shares;
        pnlByToken.set(p.token_id, pnl);
        return pnl;
      } catch {
        return 0;
      }
    }),
  );
  const pnl24h = pnlParts.reduce((a, b) => a + b, 0);
  const pnl24hPct = totalValue > 0 ? (pnl24h / totalValue) * 100 : null;

  const positionsWithPnl: PortfolioPosition[] = positions.map((p) => {
    const pnl = pnlByToken.get(p.token_id) ?? null;
    const pnlPct =
      pnl !== null && p.value !== null && Math.abs(p.value) > 0
        ? (pnl / Math.abs(p.value)) * 100
        : null;
    return pnl !== null ? { ...p, pnl, pnl_pct: pnlPct } : p;
  });

  // 30d performance series (daily), approximated from public prices-history and current share counts.
  const chartPositions = positionsWithPnl
    .slice()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 6);

  const endTs = Math.floor(Date.now() / 1000);
  const startTs = daysAgoTs(30);
  const seriesByToken = await Promise.all(
    chartPositions.map(async (p) => {
      try {
        const hist = await getPricesHistory({ tokenId: p.token_id, startTs, endTs });
        const pts = (hist.history ?? []).slice().sort((a, b) => a.t - b.t);
        return { tokenId: p.token_id, shares: p.shares, points: pts };
      } catch {
        return {
          tokenId: p.token_id,
          shares: p.shares,
          points: [] as Array<{ t: number; p: number }>,
        };
      }
    }),
  );

  const days: number[] = [];
  for (let i = 30; i >= 0; i -= 1) {
    const t = endTs - i * 86_400;
    days.push(t);
  }

  const performance30d: PortfolioPerformancePoint[] = days.map((t) => {
    const positionsValue = seriesByToken.reduce((sum, s) => {
      const price = sampleSeriesAt(s.points, t);
      return sum + (price !== null ? price * s.shares : 0);
    }, 0);
    return { t, v: (cashBalance ?? 0) + positionsValue };
  });

  const suggestedEvents = await listTrendingEvents(4);
  const suggested: PortfolioSuggestedMarket[] = suggestedEvents.map((e) => {
    const m = (e.markets ?? [])[0];
    const outcomes = safeParseStringArray(m?.outcomes) ?? [];
    const prices = safeParseStringArray(m?.outcomePrices) ?? [];
    const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
    const yesPrice =
      yesIdx !== -1 && typeof prices[yesIdx] === "string" ? toNumber(prices[yesIdx]) : null;
    return {
      event_slug: e.slug,
      title: e.title,
      market_slug: m?.slug ?? null,
      market_question: m?.question ?? null,
      yes_price: yesPrice,
    };
  });

  return {
    provider: "polymarket",
    cash_balance: cashBalance,
    total_value: Number.isFinite(totalValue) ? totalValue : null,
    pnl_24h: Number.isFinite(pnl24h) ? pnl24h : null,
    pnl_24h_pct: pnl24hPct !== null ? clamp(pnl24hPct, -999, 999) : null,
    performance_30d: performance30d,
    positions: positionsWithPnl,
    suggested,
  };
}

async function getKalshiPortfolioData(internalUserId: string): Promise<PortfolioData> {
  const balanceRaw = await getKalshiBalance(internalUserId);
  const balanceCents = toNumber((balanceRaw as any)?.balance ?? null);
  const portfolioValueCents = toNumber((balanceRaw as any)?.portfolio_value ?? null);
  const cash = balanceCents !== null ? balanceCents / 100 : null;
  const totalValue = portfolioValueCents !== null ? portfolioValueCents / 100 : null;

  const marketPositions: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i += 1) {
    const page = await getKalshiPositionsPage(internalUserId, {
      cursor: cursor ?? undefined,
      count_filter: "position",
      limit: 500,
    });
    const rows = ((page as any)?.market_positions ?? []) as any[];
    if (Array.isArray(rows)) marketPositions.push(...rows);
    cursor =
      typeof (page as any)?.cursor === "string" && (page as any).cursor ? (page as any).cursor : null;
    if (!cursor) break;
  }

  const tickers = marketPositions
    .map((kp) => String(kp?.ticker ?? kp?.market_ticker ?? "").trim())
    .filter(Boolean)
    .slice(0, 500);

  const marketInfoByTicker = new Map<string, any>();
  for (let i = 0; i < tickers.length; i += 90) {
    const chunk = tickers.slice(i, i + 90);
    const resp = await listKalshiMarketsByTickers(chunk).catch(() => ({ markets: [] as any[] }));
    for (const m of (resp as any)?.markets ?? []) {
      const t = String(m?.ticker ?? "").trim();
      if (t) marketInfoByTicker.set(t, m);
    }
  }

  const positions: PortfolioPosition[] = marketPositions
    .map((kp) => {
      const ticker = String(kp?.ticker ?? kp?.market_ticker ?? "").trim();
      const position = toNumber(kp?.position ?? null) ?? 0;
      const shares = Math.abs(position);
      if (!ticker || shares <= 0) return null;

      const sideLower = position >= 0 ? "yes" : "no";
      const outcome = position >= 0 ? "YES" : "NO";

      const market = marketInfoByTicker.get(ticker) ?? null;
      const marketQuestion = String(market?.title ?? market?.yes_sub_title ?? ticker).trim() || ticker;

      const bidCents = toNumber(sideLower === "yes" ? market?.yes_bid : market?.no_bid);
      const askCents = toNumber(sideLower === "yes" ? market?.yes_ask : market?.no_ask);
      const midCents =
        bidCents !== null && askCents !== null ? (bidCents + askCents) / 2 : bidCents ?? askCents ?? null;
      const currentPrice = midCents !== null ? midCents / 100 : null;

      const exposureCents = toNumber(kp?.market_exposure ?? null);
      const avgPrice = exposureCents !== null && shares > 0 ? exposureCents / shares / 100 : null;

      const value = currentPrice !== null ? shares * currentPrice : null;

      const realizedCents = toNumber(kp?.realized_pnl ?? null);
      const pnl = realizedCents !== null ? realizedCents / 100 : null;
      const exposure = exposureCents !== null ? exposureCents / 100 : null;
      const pnlPct =
        pnl !== null && exposure !== null && Math.abs(exposure) > 0 ? (pnl / Math.abs(exposure)) * 100 : null;

      return {
        provider: "kalshi" as const,
        market_slug: null,
        market_question: marketQuestion,
        outcome,
        token_id: `${ticker}:${sideLower}`,
        shares,
        avg_price: avgPrice,
        current_price: currentPrice,
        pnl,
        pnl_pct: pnlPct,
        value,
      };
    })
    .filter(isPresent)
    .slice(0, 200);

  const performance30d: PortfolioPerformancePoint[] = totalValue
    ? Array.from({ length: 31 }).map((_, idx) => ({
        t: daysAgoTs(30 - idx),
        v: totalValue,
      }))
    : [];

  return {
    provider: "kalshi",
    cash_balance: cash,
    total_value: totalValue ?? cash,
    pnl_24h: null,
    pnl_24h_pct: null,
    performance_30d: performance30d,
    positions,
    suggested: [],
  };
}

export async function getPortfolioData(options?: { preferredProvider?: Provider | "auto" }): Promise<PortfolioData> {
  const ensured = await ensureUser();

  const [poly, kalshi] = await Promise.all([
    getPolymarketAccount(ensured.user_id).catch(() => null),
    getKalshiAccount(ensured.user_id).catch(() => null),
  ]);

  const pref = options?.preferredProvider ?? "auto";

  if ((pref === "polymarket" || pref === "auto") && poly) {
    return getPolymarketPortfolio(ensured.user_id);
  }

  if ((pref === "kalshi" || pref === "auto") && kalshi) {
    return getKalshiPortfolioData(ensured.user_id);
  }

  // Fallback to the other provider if preference isn't connected.
  if (pref === "polymarket" && kalshi) {
    return getKalshiPortfolioData(ensured.user_id);
  }
  if (pref === "kalshi" && poly) {
    return getPolymarketPortfolio(ensured.user_id);
  }

  return {
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
