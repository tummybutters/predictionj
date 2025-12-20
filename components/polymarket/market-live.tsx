"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

type ClobBookLevel = { price: string; size: string };
type ClobBook = {
  asset_id: string;
  timestamp: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
};

type PricePoint = { t: number; p: number };

type DataApiTrade = {
  asset?: string;
  side?: "BUY" | "SELL";
  price?: number;
  size?: number;
  timestamp?: number;
  outcome?: string;
};

function formatPercent(p: string | number | undefined | null): string {
  const n = typeof p === "string" ? Number(p) : (p ?? NaN);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatPpDelta(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const pp = delta * 100;
  const rounded = Math.round(pp * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}pp`;
}

function formatPrice(p: string | number | undefined | null): string {
  const n = typeof p === "string" ? Number(p) : (p ?? NaN);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3);
}

function formatAgo(ts: number | undefined): string {
  if (!ts) return "—";
  const ms = ts < 2_000_000_000 ? ts * 1000 : ts;
  const delta = Date.now() - ms;
  if (!Number.isFinite(delta) || delta < 0) return "—";
  if (delta < 60_000) return `${Math.max(1, Math.round(delta / 1000))}s`;
  if (delta < 60 * 60_000) return `${Math.round(delta / 60_000)}m`;
  return `${Math.round(delta / (60 * 60_000))}h`;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export function PolymarketMarketLive({
  conditionId,
  tokenIds,
  outcomes,
  className,
}: {
  conditionId?: string | null;
  tokenIds: string[];
  outcomes: string[];
  className?: string;
}) {
  const [booksByToken, setBooksByToken] = React.useState<Record<string, ClobBook | undefined>>({});
  const [trades, setTrades] = React.useState<DataApiTrade[]>([]);
  const [pricesByToken, setPricesByToken] = React.useState<
    Record<string, PricePoint[] | undefined>
  >({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const controllerRef = React.useRef<AbortController | null>(null);
  const lastPricesFetchAtRef = React.useRef(0);

  const fetchAll = React.useCallback(async () => {
    const hasBooks = tokenIds.some(Boolean);
    const hasTrades = Boolean(conditionId);
    if (!hasBooks && !hasTrades) return;

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");

    try {
      const tasks: Promise<void>[] = [];
      const now = Date.now();
      const shouldFetchPrices = now - lastPricesFetchAtRef.current > 120_000;

      if (hasBooks) {
        tasks.push(
          Promise.all(
            tokenIds
              .filter(Boolean)
              .slice(0, 6)
              .map(async (tokenId) => {
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

        if (shouldFetchPrices) {
          tasks.push(
            Promise.all(
              tokenIds
                .filter(Boolean)
                .slice(0, 6)
                .map(async (tokenId) => {
                  const data = await fetchJson<{ points: PricePoint[] }>(
                    `/api/polymarket/prices-history?token_id=${encodeURIComponent(tokenId)}&interval=1d`,
                    controller.signal,
                  );
                  const points = Array.isArray(data.points) ? data.points : [];
                  return [tokenId, points.slice(-240)] as const;
                }),
            ).then((pairs) => {
              lastPricesFetchAtRef.current = now;
              setPricesByToken((prev) => {
                const next = { ...prev };
                for (const [tokenId, points] of pairs) next[tokenId] = points;
                return next;
              });
            }),
          );
        }
      }

      if (hasTrades && conditionId) {
        tasks.push(
          fetchJson<{ trades: DataApiTrade[] }>(
            `/api/polymarket/trades?market=${encodeURIComponent(conditionId)}&limit=20`,
            controller.signal,
          ).then((data) => {
            setTrades(Array.isArray(data.trades) ? data.trades : []);
          }),
        );
      }

      await Promise.all(tasks);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [conditionId, tokenIds]);

  React.useEffect(() => {
    void fetchAll();
    const handle = window.setInterval(() => void fetchAll(), 6500);
    return () => {
      window.clearInterval(handle);
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
    };
  }, [fetchAll]);

  const rows = React.useMemo(() => {
    const max = Math.min(outcomes.length, tokenIds.length);
    const lastTradeByAsset = new Map<string, DataApiTrade>();
    for (const t of trades) {
      if (!t.asset || !t.timestamp) continue;
      const prev = lastTradeByAsset.get(t.asset);
      if (!prev || (prev.timestamp ?? 0) < t.timestamp) lastTradeByAsset.set(t.asset, t);
    }

    return Array.from({ length: max }).map((_, idx) => {
      const outcome = outcomes[idx] ?? `Outcome ${idx + 1}`;
      const tokenId = tokenIds[idx] ?? "";
      const book = tokenId ? booksByToken[tokenId] : undefined;
      const points = tokenId ? pricesByToken[tokenId] : undefined;
      const bestBid = book?.bids?.[0]?.price;
      const bestAsk = book?.asks?.[0]?.price;
      const last = tokenId ? lastTradeByAsset.get(tokenId) : undefined;
      return { idx, outcome, tokenId, bestBid, bestAsk, last, points };
    });
  }, [booksByToken, outcomes, pricesByToken, tokenIds, trades]);

  const showEmpty = rows.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted">
          {status === "loading"
            ? "Updating…"
            : status === "error"
              ? "Live data unavailable"
              : "Live data"}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8"
          onClick={() => void fetchAll()}
        >
          Refresh
        </Button>
      </div>

      {showEmpty ? (
        <EmptyState className="rounded-2xl">No live data available for this market.</EmptyState>
      ) : (
        <InsetPanel className="rounded-2xl p-3">
          <div className="grid gap-2">
            {rows.map((r) => (
              <div
                key={`${r.tokenId}-${r.idx}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/10 bg-panel/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold text-text/85">{r.outcome}</div>
                  <div className="mt-1 font-mono text-xs text-muted">
                    Bid {formatPercent(r.bestBid)} · Ask {formatPercent(r.bestAsk)}
                    {r.last?.price != null ? (
                      <>
                        {" · "}
                        Last {formatPercent(r.last.price)} ({formatAgo(r.last.timestamp)})
                      </>
                    ) : null}
                    {r.points && r.points.length >= 2 ? (
                      <>
                        {" · "}
                        24h {formatPpDelta(r.points[r.points.length - 1].p - r.points[0].p)}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-muted">
                  <span className="hidden sm:inline">Bid {formatPrice(r.bestBid)}</span>
                  <span className="hidden sm:inline">Ask {formatPrice(r.bestAsk)}</span>
                </div>
              </div>
            ))}
          </div>

          {trades.length ? (
            <div className="mt-3">
              <div className="mb-2 text-xs text-muted">Recent trades</div>
              <div className="grid gap-1">
                {trades.slice(0, 10).map((t, i) => (
                  <div
                    key={`${t.asset ?? "asset"}-${t.timestamp ?? 0}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-xs"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-mono text-text/80">{formatAgo(t.timestamp)}</span>
                      <span className="text-muted"> · </span>
                      <span className="text-text/85">{t.outcome ?? "—"}</span>
                      <span className="text-muted"> · </span>
                      <span className="font-mono text-text/80">
                        {formatPercent(t.price ?? null)}
                      </span>
                    </div>
                    <div className="shrink-0 font-mono text-muted">
                      {t.size != null && Number.isFinite(t.size) ? t.size.toFixed(2) : "—"}{" "}
                      {t.side ?? ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </InsetPanel>
      )}
    </div>
  );
}
