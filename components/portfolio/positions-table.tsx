"use client";

import * as React from "react";
import Link from "next/link";

import type { PortfolioPosition } from "@/services/trading/portfolio";
import { cn } from "@/lib/cn";

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  return `$${p.toFixed(2)}`;
}

function formatShares(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatSignedUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${formatUsd(n)}`;
}

export function PositionsTable({ positions }: { positions: PortfolioPosition[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) => {
      return (
        p.market_question.toLowerCase().includes(q) ||
        (p.outcome ?? "").toLowerCase().includes(q) ||
        p.token_id.toLowerCase().includes(q)
      );
    });
  }, [positions, query]);

  return (
    <div className="rounded-2xl border border-border/15 bg-panel/55 shadow-glass">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="text-sm font-semibold text-text/85">
          Positions <span className="text-muted">({filtered.length} Active)</span>
        </div>
        <div className="w-full sm:w-[240px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter positions..."
            className={cn(
              "h-9 w-full rounded-xl border border-border/20 bg-panel2/35 px-3 text-sm text-text/80 outline-none shadow-plush",
              "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/20",
            )}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.4fr_0.5fr_0.55fr_0.55fr_0.6fr_0.7fr_0.6fr_0.5fr] gap-3 border-t border-border/15 bg-panel2/35 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <div>Market</div>
            <div>Outcome</div>
            <div className="text-right">Shares</div>
            <div className="text-right">Avg Price</div>
            <div className="text-right">Current</div>
            <div className="text-right">Value</div>
            <div className="text-right">P/L</div>
            <div className="text-right">Action</div>
          </div>

          <div className="divide-y divide-border/15">
            {filtered.map((p) => {
              const kalshiTicker = p.provider === "kalshi" ? p.token_id.split(":")[0] : null;
              const href =
                p.provider === "polymarket" && p.market_slug
                  ? `/markets/markets/${encodeURIComponent(p.market_slug)}`
                  : p.provider === "kalshi" && kalshiTicker
                    ? `/markets/kalshi/${encodeURIComponent(kalshiTicker)}`
                    : null;
              return (
                <div
                  key={`${p.provider}-${p.token_id}`}
                  className="grid grid-cols-[1.4fr_0.5fr_0.55fr_0.55fr_0.6fr_0.7fr_0.6fr_0.5fr] items-center gap-3 px-5 py-3 text-sm text-text/70"
                >
                  <div className="min-w-0">
                    {href ? (
                      <Link href={href} className="block">
                        <div className="line-clamp-1 font-semibold text-text/85 hover:underline">
                          {p.market_question}
                        </div>
                        <div className="mt-1 text-xs text-muted">{p.provider}</div>
                      </Link>
                    ) : (
                      <>
                        <div className="line-clamp-1 font-semibold text-text/85">
                          {p.market_question}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {p.provider}
                          {p.provider === "kalshi" && kalshiTicker ? (
                            <>
                              {" · "}
                              <span className="font-mono text-text/70">{kalshiTicker}</span>
                            </>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <span className="inline-flex rounded-md border border-border/20 bg-panel2/35 px-2 py-0.5 text-[11px] font-semibold text-text/70">
                      {p.outcome ?? "—"}
                    </span>
                  </div>

                  <div className="text-right font-mono text-[12px]">{formatShares(p.shares)}</div>
                  <div className="text-right font-mono text-[12px]">{formatPrice(p.avg_price)}</div>
                  <div className="text-right font-mono text-[12px]">
                    {formatPrice(p.current_price)}
                  </div>
                  <div className="text-right font-mono text-[12px]">{formatUsd(p.value)}</div>
                  <div className="text-right font-mono text-[12px]">
                    {p.pnl != null ? (
                      <span className={cn(p.pnl >= 0 ? "text-emerald-300" : "text-rose-300")}>
                        {formatSignedUsd(p.pnl)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                  <div className="text-right">
                    {href ? (
                      <Link
                        href={href}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Trade
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No matches.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
