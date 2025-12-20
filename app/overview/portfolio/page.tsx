import Link from "next/link";

import { getPortfolioData } from "@/services/trading/portfolio";
import { getMirroredPortfolioData } from "@/services/trading/mirrored";
import { syncTradingNow } from "@/services/trading/sync";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { cn } from "@/lib/cn";
import { syncTradingNowAction } from "@/app/overview/portfolio/actions";

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatSignedUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${formatUsd(n)}`;
}

function computePath(
  points: Array<{ t: number; v: number }>,
  width: number,
  height: number,
): string {
  if (points.length < 2) return "";
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
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

  let d = `M ${xScale(points[0]!.t).toFixed(2)} ${yScale(points[0]!.v).toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${xScale(points[i]!.t).toFixed(2)} ${yScale(points[i]!.v).toFixed(2)}`;
  }
  return d;
}

function categoryForQuestion(q: string): string {
  const s = q.toLowerCase();
  if (/(btc|bitcoin|eth|ethereum|crypto|solana|bnb|polygon)/.test(s)) return "Crypto";
  if (/(election|trump|biden|senate|house|president|politic)/.test(s)) return "Politics";
  if (/(nba|nfl|mlb|nhl|soccer|football|super bowl|world cup)/.test(s)) return "Sports";
  return "Pop Culture";
}

const ALLOC_COLORS: Record<string, string> = {
  Politics: "bg-accent",
  Crypto: "bg-accent3",
  Sports: "bg-accent2",
  "Pop Culture": "bg-muted/60",
};

export default async function PortfolioPage() {
  let mirrored = await getMirroredPortfolioData({ maxAgeSeconds: 120 }).catch(() => null);
  if (!mirrored?.mirrored) {
    await syncTradingNow().catch(() => null);
    mirrored = await getMirroredPortfolioData({ maxAgeSeconds: 240 }).catch(() => null);
  }
  const data = mirrored?.mirrored ? mirrored : await getPortfolioData();

  if (!data.provider) {
    return (
      <main className="min-h-screen bg-bg px-6 py-10 text-text">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/15 bg-panel/55 p-8 shadow-glass">
          <div className="text-2xl font-semibold tracking-tight">Portfolio</div>
          <div className="mt-2 text-sm text-muted">
            Connect Polymarket or Kalshi to view your holdings.
          </div>
          <div className="mt-6">
            <Link
              href="/settings"
              className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const positions = data.positions
    .slice()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 50);

  const totalValue = data.total_value ?? 0;
  const cashBalance = data.cash_balance ?? 0;

  const alloc = (() => {
    const by: Record<string, number> = {};
    for (const p of positions) {
      const v = p.value ?? 0;
      const c = categoryForQuestion(p.market_question);
      by[c] = (by[c] ?? 0) + v;
    }
    const entries = Object.entries(by)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
    const denom = entries.reduce((s, e) => s + e.value, 0) || 1;
    return entries.map((e) => ({
      ...e,
      pct: (e.value / denom) * 100,
      color: ALLOC_COLORS[e.label] ?? "bg-accent",
    }));
  })();

  const path = computePath(data.performance_30d, 640, 220);
  const perfChangePct =
    data.performance_30d.length >= 2
      ? ((data.performance_30d[data.performance_30d.length - 1]!.v - data.performance_30d[0]!.v) /
          Math.max(1, data.performance_30d[0]!.v)) *
        100
      : null;

  return (
    <main className="min-h-screen bg-bg px-6 pb-16 pt-8 text-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-semibold tracking-tight">Portfolio</div>
            <div className="mt-1 text-sm text-muted">Overview of your assets and performance.</div>
          </div>
          <div className="flex items-center gap-2">
            <form action={syncTradingNowAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
              >
                Sync now
              </button>
            </form>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
            >
              Deposit
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
            >
              Withdraw
            </Link>
          </div>
        </div>

        {"mirrored" in data ? (
          <div className="text-xs text-muted">
            Data source:{" "}
            <span className={cn("font-mono", data.mirrored ? "text-emerald-300" : "text-amber-300")}>
              {data.mirrored ? "mirrored" : "live"}
            </span>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Total Value
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatUsd(totalValue)}</div>
            <div
              className={cn(
                "mt-1 text-sm font-medium",
                (perfChangePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {perfChangePct != null
                ? `${perfChangePct >= 0 ? "+" : ""}${perfChangePct.toFixed(2)}%`
                : "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Cash Balance
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatUsd(cashBalance)}</div>
            <div className="mt-1 text-sm text-muted">Available to trade</div>
          </div>

          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              24H Profit/Loss
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                (data.pnl_24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {formatSignedUsd(data.pnl_24h)}
            </div>
            <div
              className={cn(
                "mt-1 text-sm font-medium",
                (data.pnl_24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {data.pnl_24h_pct != null
                ? `${data.pnl_24h_pct >= 0 ? "+" : ""}${data.pnl_24h_pct.toFixed(2)}%`
                : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text/85">Performance</div>
                <div className="mt-1 text-xs text-muted">Past 30 Days</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="rounded-lg border border-accent/35 bg-accent/15 px-2 py-1 text-text">
                  1M
                </span>
                <span className="rounded-lg border border-border/20 bg-panel2/35 px-2 py-1">
                  3M
                </span>
                <span className="rounded-lg border border-border/20 bg-panel2/35 px-2 py-1">
                  YTD
                </span>
                <span className="rounded-lg border border-border/20 bg-panel2/35 px-2 py-1">
                  ALL
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border/15 bg-panel2/35">
              <div className="relative h-[240px] w-full">
                <svg viewBox="0 0 640 220" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="perfFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="rgb(var(--accent))" stopOpacity="0.85" />
                      <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0.12" />
                    </linearGradient>
                  </defs>
                  {path ? (
                    <>
                      <path
                        d={path}
                        fill="none"
                        stroke="rgb(var(--accent))"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d={`${path} L 640 220 L 0 220 Z`}
                        fill="url(#perfFill)"
                        opacity="0.55"
                      />
                    </>
                  ) : (
                    <text x="16" y="30" fill="rgb(var(--muted))" opacity="0.75" fontSize="12">
                      Performance unavailable
                    </text>
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
            <div className="text-sm font-semibold text-text/85">Asset Allocation</div>
            <div className="mt-4 overflow-hidden rounded-full border border-border/15 bg-panel2/35">
              <div className="flex h-3 w-full">
                {alloc.map((a) => (
                  <div
                    key={a.label}
                    className={cn("h-full", a.color)}
                    style={{ width: `${a.pct}%` }}
                  />
                ))}
                {alloc.length === 0 ? <div className="h-full w-full bg-panel2/35" /> : null}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {alloc.map((a) => (
                <div key={a.label} className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full", a.color)} />
                  <div className="flex-1 text-sm text-text/70">{a.label}</div>
                  <div className="text-sm font-semibold text-text/80">{Math.round(a.pct)}%</div>
                </div>
              ))}
              {alloc.length === 0 ? <div className="text-sm text-muted">—</div> : null}
            </div>
          </div>
        </div>

        <PositionsTable positions={positions} />

        <div className="space-y-3">
          <div className="text-sm font-semibold text-text/80">Suggested for You</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.suggested.slice(0, 4).map((s) => {
              const href = s.market_slug
                ? `/markets/markets/${encodeURIComponent(s.market_slug)}`
                : `/markets/events/${encodeURIComponent(s.event_slug)}`;
              return (
                <Link
                  key={s.event_slug}
                  href={href}
                  className="rounded-2xl border border-border/15 bg-panel/55 p-4 shadow-glass transition-colors hover:bg-panel/70"
                >
                  <div className="line-clamp-2 text-sm font-semibold text-text/85">{s.title}</div>
                  <div className="mt-2 text-xs text-muted">
                    {s.yes_price != null ? `Yes ${Math.round(s.yes_price * 100)}c` : "—"}
                  </div>
                </Link>
              );
            })}
            {data.suggested.length === 0 ? (
              <div className="rounded-2xl border border-border/15 bg-panel/55 p-4 text-sm text-muted shadow-plush">
                —
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
