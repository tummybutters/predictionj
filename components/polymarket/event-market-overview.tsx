"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

type GammaTagLite = {
  id: string;
  label: string;
  slug: string;
};

type GammaMarketLite = {
  id: string;
  slug: string;
  question?: string;
  description?: string;
  endDate?: string;
  endDateIso?: string;
  liquidity?: string;
  volume?: string;
  bestBid?: number | null;
  bestAsk?: number | null;
  outcomes?: string;
  clobTokenIds?: string;
  conditionId?: string;
};

type PricePoint = { t: number; p: number };

type ClobBookLevel = { price: string; size: string };
type ClobBook = {
  asset_id: string;
  timestamp: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
};

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
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

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatPercent(p: number | undefined | null): string {
  if (p == null) return "—";
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

function formatPpDelta(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const pp = delta * 100;
  const rounded = Math.round(pp * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}pp`;
}

function marketScore(m: GammaMarketLite): number {
  return toNumber(m.volume) * 10 + toNumber(m.liquidity);
}

function createPredictionHref(question: string, resolveBy?: string): string {
  return `/journal/predictions?prefill=${encodeURIComponent(question)}${
    resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
  }`;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

function PriceLineChart({ points, className }: { points: PricePoint[]; className?: string }) {
  const width = 640;
  const height = 180;
  const padX = 14;
  const padY = 12;

  const safePoints = points.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.p));
  if (safePoints.length < 2) {
    return (
      <div
        className={cn("flex h-[180px] items-center justify-center text-sm text-muted", className)}
      >
        No chart data.
      </div>
    );
  }

  const xs = safePoints.map((p) => p.t);
  const ys = safePoints.map((p) => p.p);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const yPad = Math.max(0.02, (maxY - minY) * 0.08);
  const loY = Math.max(0, minY - yPad);
  const hiY = Math.min(1, maxY + yPad);

  const xScale = (t: number) => {
    if (maxX === minX) return padX;
    return padX + ((t - minX) / (maxX - minX)) * (width - padX * 2);
  };
  const yScale = (p: number) => {
    if (hiY === loY) return height - padY;
    return padY + (1 - (p - loY) / (hiY - loY)) * (height - padY * 2);
  };

  const d = safePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.t).toFixed(2)} ${yScale(p.p).toFixed(2)}`)
    .join(" ");

  const dArea = `${d} L ${xScale(maxX).toFixed(2)} ${(height - padY).toFixed(
    2,
  )} L ${xScale(minX).toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  return (
    <svg
      className={cn("h-[180px] w-full", className)}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Price chart"
    >
      <defs>
        <linearGradient id="pm_area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.26" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={dArea} fill="url(#pm_area)" />
      <path d={d} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.2" />
    </svg>
  );
}

export function PolymarketEventMarketOverview({
  eventTitle,
  eventEndDate,
  eventDescription,
  tags,
  markets,
  className,
}: {
  eventTitle: string;
  eventEndDate?: string;
  eventDescription?: string;
  tags?: GammaTagLite[];
  markets: GammaMarketLite[];
  className?: string;
}) {
  const sortedMarkets = React.useMemo(() => {
    return markets.slice().sort((a, b) => marketScore(b) - marketScore(a));
  }, [markets]);

  const [selectedMarketId, setSelectedMarketId] = React.useState<string>(
    () => sortedMarkets[0]?.id ?? "",
  );
  const selectedMarket = React.useMemo(
    () => sortedMarkets.find((m) => m.id === selectedMarketId) ?? sortedMarkets[0],
    [selectedMarketId, sortedMarkets],
  );

  const resolveBy = toDateInputValue(
    selectedMarket?.endDateIso ?? selectedMarket?.endDate ?? eventEndDate,
  );
  const marketQuestion = (selectedMarket?.question ?? eventTitle).trim() || eventTitle;

  const outcomes = React.useMemo(() => {
    return safeParseStringArray(selectedMarket?.outcomes) ?? [];
  }, [selectedMarket?.outcomes]);

  const tokenIds = React.useMemo(() => {
    return safeParseStringArray(selectedMarket?.clobTokenIds) ?? [];
  }, [selectedMarket?.clobTokenIds]);

  const outcomeCount = Math.min(outcomes.length, tokenIds.length);

  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = React.useState<number>(0);
  React.useEffect(() => {
    const nextYesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
    setSelectedOutcomeIdx(nextYesIdx >= 0 ? nextYesIdx : 0);
  }, [outcomes, selectedMarketId]);

  const selectedTokenId = tokenIds[selectedOutcomeIdx] ?? tokenIds[0] ?? "";
  const selectedOutcomeLabel = outcomes[selectedOutcomeIdx] ?? outcomes[0] ?? "Outcome";

  const [points, setPoints] = React.useState<PricePoint[]>([]);
  const [booksByToken, setBooksByToken] = React.useState<Record<string, ClobBook | undefined>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const controllerRef = React.useRef<AbortController | null>(null);
  const lastHistoryFetchAtRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!selectedMarket || outcomeCount === 0) return;

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const now = Date.now();
    const shouldFetchHistory = now - lastHistoryFetchAtRef.current > 120_000;

    setStatus("loading");
    try {
      const tasks: Promise<void>[] = [];
      tasks.push(
        Promise.all(
          tokenIds.slice(0, outcomeCount).map(async (tokenId) => {
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

      if (shouldFetchHistory && selectedTokenId) {
        tasks.push(
          fetchJson<{ points: PricePoint[] }>(
            `/api/polymarket/prices-history?token_id=${encodeURIComponent(selectedTokenId)}&interval=1d`,
            controller.signal,
          ).then((data) => {
            lastHistoryFetchAtRef.current = now;
            const next = Array.isArray(data.points) ? data.points : [];
            setPoints(next.slice(-360));
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
  }, [outcomeCount, selectedMarket, selectedTokenId, tokenIds]);

  React.useEffect(() => {
    void refresh();
    const handle = window.setInterval(() => void refresh(), 6500);
    return () => {
      window.clearInterval(handle);
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
    };
  }, [refresh]);

  React.useEffect(() => {
    lastHistoryFetchAtRef.current = 0;
    setPoints([]);
    void refresh();
  }, [refresh, selectedTokenId]);

  const headline = React.useMemo(() => {
    const p0 = points[0]?.p;
    const p1 = points.length ? points[points.length - 1]?.p : undefined;
    const delta = p0 != null && p1 != null ? p1 - p0 : undefined;
    return { last: p1, delta };
  }, [points]);

  const outcomeRows = React.useMemo(() => {
    return Array.from({ length: outcomeCount }).map((_, idx) => {
      const tokenId = tokenIds[idx] ?? "";
      const outcome = outcomes[idx] ?? `Outcome ${idx + 1}`;
      const book = tokenId ? booksByToken[tokenId] : undefined;
      const bid = book?.bids?.[0]?.price ? Number(book.bids[0].price) : null;
      const ask = book?.asks?.[0]?.price ? Number(book.asks[0].price) : null;
      const mid =
        bid != null && ask != null && Number.isFinite(bid) && Number.isFinite(ask)
          ? (bid + ask) / 2
          : (bid ?? ask ?? null);
      return { idx, tokenId, outcome, bid, ask, mid };
    });
  }, [booksByToken, outcomeCount, outcomes, tokenIds]);

  if (!selectedMarket || sortedMarkets.length === 0) {
    return (
      <Panel className={cn("p-5", className)}>
        <EmptyState className="rounded-2xl">No markets found for this event.</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel className={cn("p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted">Market</div>
          <div className="mt-1 text-balance text-lg font-semibold text-text/90">
            {marketQuestion}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            {resolveBy ? (
              <Pill className="px-2 py-1">
                <span className="font-mono">Ends {resolveBy}</span>
              </Pill>
            ) : null}
            {selectedMarket.volume ? (
              <Pill className="px-2 py-1">
                <span className="font-mono">
                  Vol {toNumber(selectedMarket.volume).toLocaleString()}
                </span>
              </Pill>
            ) : null}
            {selectedMarket.liquidity ? (
              <Pill className="px-2 py-1">
                <span className="font-mono">
                  Liq {toNumber(selectedMarket.liquidity).toLocaleString()}
                </span>
              </Pill>
            ) : null}
            <span className="text-muted">
              {status === "loading"
                ? "Updating…"
                : status === "error"
                  ? "Live data unavailable"
                  : "Live"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {sortedMarkets.length > 1 ? (
            <select
              className={cn(
                "h-9 max-w-[420px] rounded-xl border border-border/20 bg-panel/40 px-3 text-sm text-text/85 outline-none",
                "focus:border-accent/30 focus:ring-2 focus:ring-accent/15",
              )}
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              aria-label="Select market"
            >
              {sortedMarkets.slice(0, 30).map((m) => (
                <option key={m.id} value={m.id}>
                  {(m.question ?? m.slug).slice(0, 80)}
                </option>
              ))}
            </select>
          ) : null}
          <Link href={createPredictionHref(marketQuestion, resolveBy)}>
            <Button size="sm">Make prediction</Button>
          </Link>
          <Link href={`/markets/markets/${encodeURIComponent(selectedMarket.slug)}`}>
            <Button variant="secondary" size="sm">
              Market
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <InsetPanel className="rounded-2xl p-3 md:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs text-muted">Live probability</div>
              <div className="mt-1 text-sm font-semibold text-text/90">{selectedOutcomeLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill className="px-2 py-1">
                <span className="font-mono">{formatPercent(headline.last ?? null)}</span>
              </Pill>
              <Pill className="px-2 py-1">
                <span className="font-mono">
                  24h {headline.delta != null ? formatPpDelta(headline.delta) : "—"}
                </span>
              </Pill>
            </div>
          </div>
          <div className="mt-2">
            <PriceLineChart points={points} />
          </div>
        </InsetPanel>

        <InsetPanel className="rounded-2xl p-3 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted">Outcomes</div>
            {outcomeCount ? <div className="text-xs text-muted">Tap to chart</div> : null}
          </div>

          {outcomeCount ? (
            <div className="mt-2 grid gap-2">
              {outcomeRows.map((r) => {
                const active = r.idx === selectedOutcomeIdx;
                return (
                  <button
                    key={`${r.tokenId}-${r.idx}`}
                    type="button"
                    onClick={() => setSelectedOutcomeIdx(r.idx)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition-[transform,background-color,border-color,box-shadow] duration-200",
                      active
                        ? "border-accent/25 bg-panel/70 shadow-glass"
                        : "border-border/10 bg-panel/40 hover:-translate-y-[1px] hover:border-accent/20 hover:bg-panel/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-semibold text-text/85">
                          {r.outcome}
                        </div>
                        <div className="mt-1 font-mono text-xs text-muted">
                          Bid {formatPercent(r.bid)} · Ask {formatPercent(r.ask)}
                        </div>
                      </div>
                      <Pill className="px-2 py-1">
                        <span className="font-mono">{formatPercent(r.mid)}</span>
                      </Pill>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState className="mt-2 rounded-2xl">Outcome data unavailable.</EmptyState>
          )}
        </InsetPanel>
      </div>

      {eventDescription || selectedMarket.description || tags?.length ? (
        <div className="mt-4">
          <details className="rounded-2xl border border-border/10 bg-panel/35 px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-text/85">
              Rules & details
            </summary>
            <div className="mt-3 space-y-3 text-sm text-text/85">
              {selectedMarket.description ? (
                <div className="whitespace-pre-wrap">{selectedMarket.description}</div>
              ) : null}
              {eventDescription && eventDescription !== selectedMarket.description ? (
                <div className="whitespace-pre-wrap text-muted">{eventDescription}</div>
              ) : null}
              {tags?.length ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.slice(0, 12).map((t) => (
                    <Pill key={t.id} className="px-2 py-1 text-xs">
                      {t.label}
                    </Pill>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </div>
      ) : null}
    </Panel>
  );
}
