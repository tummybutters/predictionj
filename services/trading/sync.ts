import "server-only";

import { ensureUser } from "@/services/auth/ensure-user";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { getKalshiAccount } from "@/db/kalshi_accounts";
import {
  finishSyncRun,
  insertBalanceSnapshots,
  insertPortfolioSnapshot,
  insertPositionSnapshots,
  replaceOrdersCurrent,
  replacePositionsCurrent,
  startSyncRun,
  upsertBalancesCurrent,
  type TradingProvider,
} from "@/db/trading_mirror";
import { getClobBalances, getOpenOrders } from "@/services/polymarket/clob";
import { listMarketsByTokenIds } from "@/services/polymarket/gamma";
import {
  getKalshiBalance,
  getKalshiOrdersPage,
  getKalshiPositionsPage,
  listKalshiMarketsByTickers,
} from "@/services/kalshi/api";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

export async function syncPolymarketForUser(internalUserId: string): Promise<void> {
  const run = await startSyncRun({ userId: internalUserId, provider: "polymarket" });

  try {
    const balances = await getClobBalances(internalUserId);
    const balanceRows = balances.map((b) => ({
      asset_id: String(b.asset_id ?? "").trim(),
      balance: toNumber(b.balance),
      raw: b as unknown as Record<string, unknown>,
    }));

    // Current balances + snapshot
    await upsertBalancesCurrent({ userId: internalUserId, provider: "polymarket", balances: balanceRows });
    await insertBalanceSnapshots({ runId: run.id, userId: internalUserId, provider: "polymarket", balances: balanceRows });

    // Positions from token balances (non-USDC)
    const tokenBalances = balances
      .map((b) => ({
        tokenId: String(b.asset_id ?? "").trim(),
        shares: toNumber(b.balance) ?? 0,
      }))
      .filter((b) => b.tokenId && b.shares > 0)
      .filter((b) => b.tokenId.toLowerCase() !== POLYGON_USDC_ADDRESS)
      .slice(0, 120);

    const tokenIds = tokenBalances.map((b) => b.tokenId);
    const markets = tokenIds.length ? await listMarketsByTokenIds(tokenIds) : [];

    const positions = tokenBalances.map((b) => {
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
      const value = currentPrice !== null ? b.shares * currentPrice : null;

      return {
        token_id: b.tokenId,
        market_slug: market?.slug ?? null,
        market_question: market?.question ?? market?.slug ?? b.tokenId,
        outcome: idx !== -1 ? (outcomes[idx] ?? null) : null,
        shares: b.shares,
        avg_price: null,
        current_price: currentPrice,
        value,
        pnl: null,
        pnl_pct: null,
        raw: {
          token_balance: b,
          market: market ?? null,
        } as Record<string, unknown>,
      };
    });

    await replacePositionsCurrent({ userId: internalUserId, provider: "polymarket", positions });
    await insertPositionSnapshots({
      runId: run.id,
      userId: internalUserId,
      provider: "polymarket",
      positions: positions.map((p) => ({
        token_id: p.token_id,
        shares: p.shares,
        price: p.current_price,
        value: p.value,
        raw: p.raw,
      })),
    });

    const cashRow = balanceRows.find((b) => b.asset_id.toLowerCase() === POLYGON_USDC_ADDRESS);
    const cashBalance = cashRow?.balance ?? null;
    const positionsValue = positions.reduce((sum, p) => sum + (p.value ?? 0), 0);
    const totalValue = (cashBalance ?? 0) + positionsValue;
    await insertPortfolioSnapshot({
      runId: run.id,
      userId: internalUserId,
      provider: "polymarket",
      cash_balance: cashBalance,
      positions_value: Number.isFinite(positionsValue) ? positionsValue : null,
      total_value: Number.isFinite(totalValue) ? totalValue : null,
      raw: { token_count: positions.length },
    });

    // Open orders
    const openOrders = await getOpenOrders(internalUserId).catch(() => []);
    const orders = (Array.isArray(openOrders) ? openOrders : []).slice(0, 300).map((o: any) => {
      const orderId = String(o?.id ?? o?.order_id ?? o?.orderId ?? "").trim();
      const tokenId = String(o?.token_id ?? o?.asset_id ?? o?.assetId ?? "").trim() || null;
      const side = (typeof o?.side === "string" ? o.side : null) as string | null;
      const price = toNumber(o?.price);
      const size = toNumber(o?.size ?? o?.original_size ?? o?.originalSize);
      const status = (typeof o?.status === "string" ? o.status : null) as string | null;
      const createdAt =
        typeof o?.created_at === "string"
          ? o.created_at
          : typeof o?.createdAt === "string"
            ? o.createdAt
            : null;
      return {
        order_id: orderId,
        token_id: tokenId,
        side,
        price,
        size,
        status,
        created_at: createdAt,
        raw: o as Record<string, unknown>,
      };
    }).filter((o) => o.order_id);

    await replaceOrdersCurrent({ userId: internalUserId, provider: "polymarket", orders });

    await finishSyncRun({ userId: internalUserId, runId: run.id, status: "success", error: null });
  } catch (err) {
    await finishSyncRun({
      userId: internalUserId,
      runId: run.id,
      status: "error",
      error: err instanceof Error ? err.message : "Sync failed",
    }).catch(() => null);
    throw err;
  }
}

export async function syncKalshiForUser(internalUserId: string): Promise<void> {
  const run = await startSyncRun({ userId: internalUserId, provider: "kalshi" });
  try {
    const balanceRaw = await getKalshiBalance(internalUserId);
    const balanceCents = toNumber((balanceRaw as any)?.balance ?? null);
    const portfolioValueCents = toNumber((balanceRaw as any)?.portfolio_value ?? null);
    const cash = balanceCents !== null ? balanceCents / 100 : null;
    const totalValue = portfolioValueCents !== null ? portfolioValueCents / 100 : null;

    const balanceRows = [
      { asset_id: "USD", balance: cash, raw: { balance: balanceRaw } as Record<string, unknown> },
    ];
    await upsertBalancesCurrent({ userId: internalUserId, provider: "kalshi", balances: balanceRows });
    await insertBalanceSnapshots({ runId: run.id, userId: internalUserId, provider: "kalshi", balances: balanceRows });

    const marketPositions: any[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const page = await getKalshiPositionsPage(internalUserId, {
        cursor: cursor ?? undefined,
        count_filter: "position",
        limit: 500,
      });
      const rows = ((page as any)?.market_positions ?? []) as any[];
      if (Array.isArray(rows)) marketPositions.push(...rows);
      cursor = typeof (page as any)?.cursor === "string" && (page as any).cursor ? (page as any).cursor : null;
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

    const positions = Array.isArray(marketPositions)
      ? marketPositions
          .map((kp) => {
            const ticker = String(kp?.ticker ?? kp?.market_ticker ?? kp?.market ?? "").trim();
            const position = toNumber(kp?.position ?? kp?.net_position ?? null) ?? 0;
            const shares = Math.abs(position);
            if (!ticker || shares <= 0) return null;

            const outcome = position >= 0 ? "YES" : "NO";
            const sideLower = position >= 0 ? "yes" : "no";

            const market = marketInfoByTicker.get(ticker) ?? null;
            const marketQuestion =
              String(market?.title ?? market?.yes_sub_title ?? kp?.title ?? kp?.market_title ?? ticker).trim() ||
              ticker;

            // Best-effort mark: mid of bid/ask for that side.
            const bidCents = toNumber(sideLower === "yes" ? market?.yes_bid : market?.no_bid);
            const askCents = toNumber(sideLower === "yes" ? market?.yes_ask : market?.no_ask);
            const midCents =
              bidCents !== null && askCents !== null
                ? (bidCents + askCents) / 2
                : bidCents !== null
                  ? bidCents
                  : askCents !== null
                    ? askCents
                    : null;
            const currentPrice = midCents !== null ? midCents / 100 : null;

            const exposureCents = toNumber(kp?.market_exposure ?? null);
            const exposure = exposureCents !== null ? exposureCents / 100 : null;
            const avgPrice =
              exposureCents !== null && shares > 0 ? exposureCents / shares / 100 : null;

            const value = currentPrice !== null ? shares * currentPrice : null;

            const realizedCents = toNumber(kp?.realized_pnl ?? null);
            const pnl = realizedCents !== null ? realizedCents / 100 : null;
            const pnlPct =
              pnl !== null && exposure !== null && Math.abs(exposure) > 0 ? (pnl / Math.abs(exposure)) * 100 : null;

            return {
              token_id: `${ticker}:${sideLower}`,
              market_slug: null,
              market_question: marketQuestion,
              outcome,
              shares,
              avg_price: avgPrice,
              current_price: currentPrice,
              value,
              pnl,
              pnl_pct: pnlPct,
              raw: { position: kp, market } as Record<string, unknown>,
            };
          })
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .slice(0, 1000)
      : [];

    await replacePositionsCurrent({ userId: internalUserId, provider: "kalshi", positions });
    await insertPositionSnapshots({
      runId: run.id,
      userId: internalUserId,
      provider: "kalshi",
      positions: positions.map((p) => ({
        token_id: p.token_id,
        shares: p.shares,
        price: p.current_price,
        value: p.value,
        raw: p.raw,
      })),
    });

    const positionsValue =
      totalValue !== null && cash !== null ? totalValue - cash : positions.reduce((sum, p) => sum + (p.value ?? 0), 0);
    await insertPortfolioSnapshot({
      runId: run.id,
      userId: internalUserId,
      provider: "kalshi",
      cash_balance: cash,
      positions_value: Number.isFinite(positionsValue) ? positionsValue : null,
      total_value: totalValue,
      raw: { position_count: positions.length, cursor_positions: cursor },
    });

    // Resting orders
    const orders: any[] = [];
    let orderCursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const page = await getKalshiOrdersPage(internalUserId, {
        cursor: orderCursor ?? undefined,
        status: "resting",
        limit: 500,
      });
      const rows = ((page as any)?.orders ?? []) as any[];
      if (Array.isArray(rows)) orders.push(...rows);
      orderCursor =
        typeof (page as any)?.cursor === "string" && (page as any).cursor ? (page as any).cursor : null;
      if (!orderCursor) break;
    }

    const orderRows = orders.slice(0, 500).map((o) => {
      const ticker = String(o?.ticker ?? "").trim();
      const side = String(o?.side ?? "").trim().toLowerCase();
      const action = String(o?.action ?? "").trim().toLowerCase();
      const priceCents = toNumber(side === "yes" ? o?.yes_price : o?.no_price);
      const price = priceCents !== null ? priceCents / 100 : null;
      const size = toNumber(o?.remaining_count ?? o?.initial_count ?? null);
      const createdAt = typeof o?.created_time === "string" ? o.created_time : null;
      const orderId = String(o?.order_id ?? o?.id ?? "").trim();
      return {
        order_id: orderId,
        token_id: ticker && (side === "yes" || side === "no") ? `${ticker}:${side}` : null,
        side: action && side ? `${action.toUpperCase()} ${side.toUpperCase()}` : null,
        price,
        size,
        status: typeof o?.status === "string" ? o.status : null,
        created_at: createdAt,
        raw: o as Record<string, unknown>,
      };
    }).filter((r) => r.order_id);

    await replaceOrdersCurrent({ userId: internalUserId, provider: "kalshi", orders: orderRows });

    await finishSyncRun({ userId: internalUserId, runId: run.id, status: "success", error: null });
  } catch (err) {
    await finishSyncRun({
      userId: internalUserId,
      runId: run.id,
      status: "error",
      error: err instanceof Error ? err.message : "Sync failed",
    }).catch(() => null);
    throw err;
  }
}

export async function syncTradingNow(): Promise<{ provider: TradingProvider | null }> {
  const ensured = await ensureUser();

  const [poly, kalshi] = await Promise.all([
    getPolymarketAccount(ensured.user_id).catch(() => null),
    getKalshiAccount(ensured.user_id).catch(() => null),
  ]);

  return syncTradingNowForUser(ensured.user_id, {
    preferredProvider: "auto",
    polyConnected: Boolean(poly),
    kalshiConnected: Boolean(kalshi),
  });
}

export async function syncTradingNowForUser(
  internalUserId: string,
  options?: {
    preferredProvider?: TradingProvider | "auto";
    polyConnected?: boolean;
    kalshiConnected?: boolean;
  },
): Promise<{ provider: TradingProvider | null }> {
  const pref = options?.preferredProvider ?? "auto";
  const polyOk = options?.polyConnected ?? true;
  const kalshiOk = options?.kalshiConnected ?? true;

  if ((pref === "polymarket" || pref === "auto") && polyOk) {
    // Try Polymarket first when preferred/auto.
    try {
      await syncPolymarketForUser(internalUserId);
      return { provider: "polymarket" };
    } catch {
      // fall through
    }
  }

  if ((pref === "kalshi" || pref === "auto") && kalshiOk) {
    try {
      await syncKalshiForUser(internalUserId);
      return { provider: "kalshi" };
    } catch {
      // fall through
    }
  }

  // If explicit preference failed, attempt the other provider as fallback.
  if (pref === "polymarket" && kalshiOk) {
    await syncKalshiForUser(internalUserId);
    return { provider: "kalshi" };
  }
  if (pref === "kalshi" && polyOk) {
    await syncPolymarketForUser(internalUserId);
    return { provider: "polymarket" };
  }

  return { provider: null };
}
