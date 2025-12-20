"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

type ClobBookLevel = { price: string; size: string };
type ClobBook = {
  market: string;
  asset_id: string;
  timestamp: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
};

type PricePoint = { t: number; p: number };

type DataApiTrade = {
  proxyWallet?: string;
  pseudonym?: string;
  side?: "BUY" | "SELL";
  asset?: string;
  size?: number;
  price?: number;
  timestamp?: number;
};

type RelatedMarket = {
  slug: string;
  question: string;
  price?: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNumberLoose(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatPercent(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  return p.toFixed(3);
}

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function formatUsdCompact(value: string | null | undefined): string {
  const n = toNumberLoose(value);
  if (n === null) return "—";
  return `$${formatCompact(n)}`;
}

function formatAgo(tsSeconds: number | undefined): string {
  if (!tsSeconds) return "—";
  const ms = tsSeconds < 2_000_000_000 ? tsSeconds * 1000 : tsSeconds;
  const delta = Date.now() - ms;
  if (!Number.isFinite(delta) || delta < 0) return "—";
  if (delta < 60_000) return `${Math.max(1, Math.round(delta / 1000))}s`;
  if (delta < 60 * 60_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < 24 * 60 * 60_000) return `${Math.round(delta / (60 * 60_000))}h`;
  return `${Math.round(delta / (24 * 60 * 60_000))}d`;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

function findOutcomeIndex(outcomes: string[], names: string[]): number | null {
  const lower = outcomes.map((o) => o.toLowerCase());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return null;
}

function midPrice(book: ClobBook | undefined): number | null {
  const bid = toNumber(book?.bids?.[0]?.price);
  const ask = toNumber(book?.asks?.[0]?.price);
  if (bid !== null && ask !== null) return (bid + ask) / 2;
  return bid ?? ask ?? null;
}

function computeSparkPath(points: PricePoint[], width: number, height: number): string {
  if (points.length < 2) return "";
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.p);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xScale = (x: number) => {
    if (maxX === minX) return 0;
    return ((x - minX) / (maxX - minX)) * width;
  };
  const yScale = (y: number) => {
    if (maxY === minY) return height / 2;
    return height - ((y - minY) / (maxY - minY)) * height;
  };
  let d = `M ${xScale(points[0].t).toFixed(2)} ${yScale(points[0].p).toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${xScale(points[i].t).toFixed(2)} ${yScale(points[i].p).toFixed(2)}`;
  }
  return d;
}

function rangeToStartEnd(range: "1D" | "1W" | "1M" | "ALL") {
  const end = Math.floor(Date.now() / 1000);
  const day = 86_400;
  const start =
    range === "1D"
      ? end - day
      : range === "1W"
        ? end - 7 * day
        : range === "1M"
          ? end - 30 * day
          : null;
  return { startTs: start, endTs: end };
}

export function PolymarketMarketTerminal({
  market,
  cashBalance,
  relatedMarkets,
}: {
  market: {
    slug: string;
    question: string;
    description?: string | null;
    endDate?: string | null;
    conditionId?: string | null;
    outcomes: string[];
    tokenIds: string[];
    liquidity?: string | null;
    volume?: string | null;
  };
  cashBalance?: number | null;
  relatedMarkets?: RelatedMarket[];
}) {
  const yesIdx = findOutcomeIndex(market.outcomes, ["yes", "true"]) ?? 0;
  const noIdx =
    findOutcomeIndex(market.outcomes, ["no", "false"]) ?? Math.min(1, market.outcomes.length - 1);

  const [selectedIdx, setSelectedIdx] = React.useState(() => (yesIdx >= 0 ? yesIdx : 0));
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState("");

  const [booksByToken, setBooksByToken] = React.useState<Record<string, ClobBook | undefined>>({});
  const [trades, setTrades] = React.useState<DataApiTrade[]>([]);
  const [history, setHistory] = React.useState<PricePoint[]>([]);
  const [range, setRange] = React.useState<"1D" | "1W" | "1M" | "ALL">("1D");
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [tradeState, setTradeState] = React.useState<"idle" | "placing" | "success" | "error">(
    "idle",
  );
  const [tradeError, setTradeError] = React.useState<string | null>(null);

  const selectedTokenId = market.tokenIds[selectedIdx] ?? "";
  const selectedOutcome = market.outcomes[selectedIdx] ?? "Outcome";
  const selectedOutcomeTag =
    selectedIdx === yesIdx ? "YES" : selectedIdx === noIdx ? "NO" : selectedOutcome.toUpperCase();

  const controllerRef = React.useRef<AbortController | null>(null);

  const selectedPrice = React.useMemo(() => midPrice(booksByToken[selectedTokenId]), [
    booksByToken,
    selectedTokenId,
  ]);

  const limitPrice = React.useMemo(() => {
    if (selectedPrice == null) return null;
    // Tick size defaults to 0.01 (1c).
    return Math.max(0.01, Math.min(0.99, Math.round(selectedPrice * 100) / 100));
  }, [selectedPrice]);

  const amountNumber = toNumber(amount?.trim());
  const estShares =
    amountNumber !== null && limitPrice !== null && limitPrice > 0 ? amountNumber / limitPrice : null;

  async function placeOrder() {
    if (!selectedTokenId || !market.conditionId) return;
    if (amountNumber == null || amountNumber <= 0) return;
    if (limitPrice == null) return;
    if (estShares == null || estShares <= 0) return;

    setTradeState("placing");
    setTradeError(null);
    try {
      const res = await fetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: selectedTokenId,
          side: side === "buy" ? "BUY" : "SELL",
          price: limitPrice,
          size: estShares,
          tick_size: "0.01",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Order failed (${res.status})`);
      setTradeState("success");
      setAmount("");
      // Refresh local book/trades after an order.
      void fetchLive();
      window.setTimeout(() => setTradeState("idle"), 1800);
    } catch (err) {
      setTradeState("error");
      setTradeError(err instanceof Error ? err.message : "Failed to place order");
      window.setTimeout(() => setTradeState("idle"), 2500);
    }
  }

  const fetchLive = React.useCallback(async () => {
    if (!market.conditionId) return;
    const tokenIds = [market.tokenIds[yesIdx], market.tokenIds[noIdx], selectedTokenId].filter(
      Boolean,
    );
    const uniqueTokenIds = Array.from(new Set(tokenIds)).slice(0, 4);

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");

    try {
      const tasks: Promise<void>[] = [];

      tasks.push(
        Promise.all(
          uniqueTokenIds.map(async (tokenId) => {
            const data = await fetchJson<{ book: ClobBook }>(
              `/api/polymarket/book?token_id=${encodeURIComponent(tokenId)}`,
              controller.signal,
            );
            return [tokenId, data.book] as const;
          }),
        ).then((pairs) => {
          setBooksByToken((prev) => {
            const next = { ...prev };
            for (const [tokenId, book] of pairs) next[tokenId] = book;
            return next;
          });
        }),
      );

      tasks.push(
        fetchJson<{ trades: DataApiTrade[] }>(
          `/api/polymarket/trades?market=${encodeURIComponent(market.conditionId)}&limit=25`,
          controller.signal,
        ).then((data) => setTrades(Array.isArray(data.trades) ? data.trades : [])),
      );

      await Promise.all(tasks);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [market.conditionId, market.tokenIds, noIdx, selectedTokenId, yesIdx]);

  React.useEffect(() => {
    void fetchLive();
    const handle = window.setInterval(() => void fetchLive(), 6500);
    return () => {
      window.clearInterval(handle);
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
    };
  }, [fetchLive]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      if (!selectedTokenId) return;
      try {
        const { startTs, endTs } = rangeToStartEnd(range);
        const qs = new URLSearchParams();
        qs.set("token_id", selectedTokenId);
        if (startTs && endTs) {
          qs.set("startTs", String(startTs));
          qs.set("endTs", String(endTs));
        } else {
          qs.set("interval", "1d");
        }

        const data = await fetchJson<{ points: PricePoint[] }>(
          `/api/polymarket/prices-history?${qs.toString()}`,
          controller.signal,
        );
        if (cancelled) return;
        setHistory(Array.isArray(data.points) ? data.points.slice(-240) : []);
      } catch {
        if (cancelled) return;
        setHistory([]);
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [range, selectedTokenId]);

  const yesBook = market.tokenIds[yesIdx] ? booksByToken[market.tokenIds[yesIdx]!] : undefined;
  const noBook = market.tokenIds[noIdx] ? booksByToken[market.tokenIds[noIdx]!] : undefined;
  const selectedBook = selectedTokenId ? booksByToken[selectedTokenId] : undefined;

  const yesPrice = midPrice(yesBook);
  const noPrice = midPrice(noBook);

  const canTrade =
    Boolean(market.conditionId) &&
    Boolean(selectedTokenId) &&
    amountNumber !== null &&
    amountNumber > 0 &&
    limitPrice !== null &&
    tradeState !== "placing";

  const pctChange24h =
    history.length >= 2
      ? ((history[history.length - 1]!.p - history[0]!.p) / history[0]!.p) * 100
      : null;

  const depth = React.useMemo(() => {
    const bids = (selectedBook?.bids ?? []).slice(0, 8).map((l) => ({
      price: toNumber(l.price) ?? 0,
      size: toNumber(l.size) ?? 0,
    }));
    const asks = (selectedBook?.asks ?? []).slice(0, 8).map((l) => ({
      price: toNumber(l.price) ?? 0,
      size: toNumber(l.size) ?? 0,
    }));
    const maxSize = Math.max(1, ...bids.map((b) => b.size), ...asks.map((a) => a.size));
    return { bids, asks, maxSize };
  }, [selectedBook]);

  const historyPath = React.useMemo(() => computeSparkPath(history, 640, 220), [history]);
  const spreadCents = (() => {
    const bid = depth.bids[0]?.price ?? null;
    const ask = depth.asks[0]?.price ?? null;
    if (bid === null || ask === null) return null;
    const spread = ask - bid;
    if (!Number.isFinite(spread)) return null;
    return Math.max(0, Math.round(spread * 100));
  })();

  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted">
              Markets <span className="text-muted/60">/</span> Polymarket
            </div>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">
              {market.question}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {market.endDate ? (
                <span>
                  Ends <span className="font-mono text-text/75">{market.endDate}</span>
                </span>
              ) : null}
              <span className="font-mono text-muted">Slug {market.slug}</span>
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-[360px]">
            <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
              <div className="flex overflow-hidden rounded-xl border border-border/15 bg-panel2/35">
                <button
                  type="button"
                  onClick={() => setSelectedIdx(yesIdx)}
                  className={cn(
                    "flex-1 px-3 py-2 text-center text-sm font-semibold transition-colors",
                    selectedIdx === yesIdx
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "text-muted hover:bg-panel2/50",
                  )}
                >
                  YES{" "}
                  <span className="ml-2 font-mono text-xs text-text/75">
                    {yesPrice !== null ? `${Math.round(yesPrice * 100)}c` : "—"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIdx(noIdx)}
                  className={cn(
                    "flex-1 px-3 py-2 text-center text-sm font-semibold transition-colors",
                    selectedIdx === noIdx
                      ? "bg-rose-500/20 text-rose-200"
                      : "text-muted hover:bg-panel2/50",
                  )}
                >
                  NO{" "}
                  <span className="ml-2 font-mono text-xs text-text/75">
                    {noPrice !== null ? `${Math.round(noPrice * 100)}c` : "—"}
                  </span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide("buy")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    side === "buy"
                      ? "border-accent/35 bg-accent/15 text-text"
                      : "border-border/15 bg-panel2/35 text-muted hover:bg-panel2/50",
                  )}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setSide("sell")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    side === "sell"
                      ? "border-accent/35 bg-accent/15 text-text"
                      : "border-border/15 bg-panel2/35 text-muted hover:bg-panel2/50",
                  )}
                >
                  Sell
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <div>
                  Balance{" "}
                  <span className="font-mono text-text/75">
                    {cashBalance != null ? formatUsd(cashBalance) : "—"}
                  </span>
                </div>
                <Link href="/settings" className="text-accent hover:underline">
                  Deposit
                </Link>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-muted">AMOUNT</div>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/15 bg-panel2/35 px-3 py-2">
                  <span className="font-mono text-sm text-muted">$</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
                    aria-label="Trade amount in USDC"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-border/15 bg-panel/45 px-2 py-1 text-[11px] font-semibold text-text/70 shadow-plush hover:bg-panel/60"
                    onClick={() => {
                      if (cashBalance != null)
                        setAmount(String(Math.max(0, Math.floor(cashBalance))));
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-muted">
                <div className="flex items-center justify-between">
                  <span>Avg. Price</span>
                  <span className="font-mono text-text/75">{formatPrice(limitPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Est. Shares</span>
                  <span className="font-mono text-text/75">
                    {estShares !== null ? formatCompact(estShares) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-200/80">Potential Return</span>
                  <span className="font-mono text-emerald-200">
                    {amountNumber !== null ? formatUsd(0) : "—"}
                  </span>
                </div>
              </div>

                <button
                  type="button"
                  onClick={() => void placeOrder()}
                  className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-plush hover:brightness-105 disabled:opacity-50"
                  disabled={!canTrade}
                >
                  {tradeState === "placing"
                    ? "Placing…"
                    : tradeState === "success"
                      ? "Placed"
                      : tradeState === "error"
                        ? "Failed"
                        : `${side === "buy" ? "Buy" : "Sell"} ${selectedOutcomeTag}`}
                </button>

                {tradeError ? (
                  <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                    {tradeError}
                  </div>
                ) : null}

                <div className="mt-2 text-center text-[11px] text-muted">
                  By trading, you agree to the terms of service.
                </div>
              </div>
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted">{selectedOutcome} Probability</div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <div className="text-3xl font-semibold text-accent">
                      {formatPercent(selectedPrice)}
                    </div>
                    {pctChange24h != null ? (
                      <div
                        className={cn(
                          "text-sm font-medium",
                          pctChange24h >= 0 ? "text-emerald-300" : "text-rose-300",
                        )}
                      >
                        {pctChange24h >= 0 ? "+" : ""}
                        {pctChange24h.toFixed(1)}% <span className="text-muted/70">Past 24h</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted">—</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(["1D", "1W", "1M", "ALL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        range === r
                          ? "border-accent/35 bg-accent/15 text-text"
                          : "border-border/15 bg-panel2/35 text-muted hover:bg-panel2/50",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-border/15 bg-panel2/35">
                <div className="relative h-[240px] w-full">
                  <svg viewBox="0 0 640 220" className="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id="pmLine" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="rgb(var(--accent))" stopOpacity="0.9" />
                        <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0.15" />
                      </linearGradient>
                    </defs>
                    {historyPath ? (
                      <>
                        <path
                          d={historyPath}
                          fill="none"
                          stroke="rgb(var(--accent))"
                          strokeWidth="2.2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        <path
                          d={`${historyPath} L 640 220 L 0 220 Z`}
                          fill="url(#pmLine)"
                          opacity="0.55"
                        />
                      </>
                    ) : (
                      <text x="16" y="30" fill="rgb(var(--muted))" opacity="0.75" fontSize="12">
                        Price history unavailable
                      </text>
                    )}
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
                <div className="text-xs text-muted">24h Volume</div>
                <div className="mt-2 text-lg font-semibold">{formatUsdCompact(market.volume)}</div>
              </div>
              <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
                <div className="text-xs text-muted">Total Liquidity</div>
                <div className="mt-2 text-lg font-semibold">
                  {formatUsdCompact(market.liquidity)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
                <div className="text-xs text-muted">Outcome</div>
                <div className="mt-2 truncate text-sm font-semibold text-text/80">
                  {selectedOutcome}
                </div>
              </div>
              <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
                <div className="text-xs text-muted">Status</div>
                <div className="mt-2 text-sm font-semibold text-text/80">
                  {status === "loading" ? "Updating…" : status === "error" ? "Unavailable" : "Live"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
              <div className="flex items-center gap-6 border-b border-border/15 pb-3 text-sm font-medium text-muted">
                <button type="button" className="text-text">
                  Positions &amp; Activity
                </button>
                <button type="button" className="hover:text-text">
                  Market Rules
                </button>
                <button type="button" className="hover:text-text">
                  Comments
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-border/15">
                <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.5fr_0.5fr] gap-3 bg-panel2/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <div>User</div>
                  <div>Outcome</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Time</div>
                </div>
                <div className="divide-y divide-border/15">
                  {trades.slice(0, 8).map((t, idx) => (
                    <div
                      key={`${t.asset ?? "asset"}-${t.timestamp ?? 0}-${idx}`}
                      className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.5fr_0.5fr] items-center gap-3 px-4 py-2 text-sm text-text/70"
                    >
                      <div className="truncate font-mono text-[12px] text-muted">
                        {t.pseudonym ??
                          (t.proxyWallet
                            ? `${t.proxyWallet.slice(0, 6)}…${t.proxyWallet.slice(-4)}`
                            : "—")}
                      </div>
                      <div>
                        {(() => {
                          const label =
                            t.asset === market.tokenIds[yesIdx]
                              ? "YES"
                              : t.asset === market.tokenIds[noIdx]
                                ? "NO"
                                : "—";
                          const cls =
                            label === "YES"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : label === "NO"
                                ? "bg-rose-500/15 text-rose-200"
                                : "bg-panel2/35 text-muted";
                          return (
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                                cls,
                              )}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-right font-mono text-[12px]">
                        {typeof t.size === "number" ? formatCompact(t.size) : "—"}
                      </div>
                      <div className="text-right font-mono text-[12px]">
                        {typeof t.price === "number" ? `${Math.round(t.price * 100)}c` : "—"}
                      </div>
                      <div className="text-right font-mono text-[12px] text-muted">
                        {formatAgo(t.timestamp)}
                      </div>
                    </div>
                  ))}
                  {trades.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted">
                      No recent trades.
                    </div>
                  ) : null}
                </div>
              </div>

              {market.description ? (
                <div className="mt-4 text-sm text-muted">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Details
                  </div>
                  <div className="mt-2 whitespace-pre-wrap">{market.description}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text/80">Order Book</div>
                <div className="text-xs text-muted">
                  Spread: {spreadCents !== null ? `${spreadCents}¢` : "—"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <div className="text-left">Bid ({selectedOutcome})</div>
                <div className="text-right">Ask ({selectedOutcome})</div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  {depth.bids.map((b, i) => (
                    <div
                      key={`bid-${i}`}
                      className="relative overflow-hidden rounded-lg border border-border/15 bg-panel2/35 px-2 py-1.5"
                    >
                      <div
                        className="absolute inset-y-0 right-0 bg-emerald-500/10"
                        style={{ width: `${Math.min(100, (b.size / depth.maxSize) * 100)}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-2 font-mono text-[12px] text-text/70">
                        <span className="text-emerald-300">{Math.round(b.price * 100)}c</span>
                        <span className="text-muted">{formatCompact(b.size)}</span>
                      </div>
                    </div>
                  ))}
                  {depth.bids.length === 0 ? (
                    <div className="rounded-xl border border-border/15 bg-panel2/35 p-3 text-center text-sm text-muted">
                      —
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {depth.asks.map((a, i) => (
                    <div
                      key={`ask-${i}`}
                      className="relative overflow-hidden rounded-lg border border-border/15 bg-panel2/35 px-2 py-1.5"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-rose-500/10"
                        style={{ width: `${Math.min(100, (a.size / depth.maxSize) * 100)}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-2 font-mono text-[12px] text-text/70">
                        <span className="text-rose-300">{Math.round(a.price * 100)}c</span>
                        <span className="text-muted">{formatCompact(a.size)}</span>
                      </div>
                    </div>
                  ))}
                  {depth.asks.length === 0 ? (
                    <div className="rounded-xl border border-border/15 bg-panel2/35 p-3 text-center text-sm text-muted">
                      —
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass">
              <div className="text-sm font-semibold text-text/80">Related Markets</div>
              <div className="mt-3 space-y-2">
                {(relatedMarkets ?? []).slice(0, 3).map((m) => (
                  <Link
                    key={m.slug}
                    href={`/markets/markets/${encodeURIComponent(m.slug)}`}
                    className="block rounded-xl border border-border/15 bg-panel2/35 px-3 py-2 transition-colors hover:bg-panel2/50"
                  >
                    <div className="line-clamp-2 text-sm font-semibold text-text/80">
                      {m.question}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {m.price != null ? `Yes ${Math.round(m.price * 100)}c` : "—"}
                    </div>
                  </Link>
                ))}
                {(!relatedMarkets || relatedMarkets.length === 0) && (
                  <div className="rounded-xl border border-border/15 bg-panel2/35 p-3 text-sm text-muted">
                    —
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
