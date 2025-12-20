"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

function toInt(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getField(obj: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!obj) return undefined;
  return obj[key];
}

function getNumberField(obj: Record<string, unknown> | null | undefined, key: string): number | null {
  return toNumber(getField(obj, key));
}

function getStringField(obj: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = getField(obj, key);
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function formatCents(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(v)}¢`;
}

export function KalshiMarketTerminal({
  ticker,
  market,
}: {
  ticker: string;
  market?: Record<string, unknown> | null;
}) {
  const [action, setAction] = React.useState<"buy" | "sell">("buy");
  const [side, setSide] = React.useState<"yes" | "no">("yes");
  const [count, setCount] = React.useState("1");
  const [priceCents, setPriceCents] = React.useState("50");
  const [state, setState] = React.useState<"idle" | "placing" | "success" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const bid = getNumberField(market, side === "yes" ? "yes_bid" : "no_bid");
  const ask = getNumberField(market, side === "yes" ? "yes_ask" : "no_ask");

  async function place() {
    const countInt = toInt(count);
    const priceInt = toInt(priceCents);
    if (!countInt || countInt < 1) return;
    if (!priceInt || priceInt < 1 || priceInt > 99) return;

    setState("placing");
    setError(null);
    try {
      const res = await fetch("/api/kalshi/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          action,
          side,
          count: countInt,
          type: "limit",
          price_cents: priceInt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Order failed (${res.status})`);
      setState("success");
      window.setTimeout(() => setState("idle"), 1400);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to place order");
      window.setTimeout(() => setState("idle"), 2200);
    }
  }

  return (
    <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 shadow-glass">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Kalshi</div>
          <div className="mt-1 line-clamp-2 text-lg font-semibold text-text/85">
            {getStringField(market, "title") ?? getStringField(market, "yes_sub_title") ?? ticker}
          </div>
          <div className="mt-1 text-xs text-muted">
            Ticker <span className="font-mono text-text/70">{ticker}</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div>
            Bid <span className="font-mono text-text/80">{formatCents(bid)}</span>
          </div>
          <div>
            Ask <span className="font-mono text-text/80">{formatCents(ask)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Action
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAction("buy")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                action === "buy"
                  ? "border-accent/35 bg-accent/15 text-text"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setAction("sell")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                action === "sell"
                  ? "border-accent/35 bg-accent/15 text-text"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              Sell
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Side
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setSide("yes")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                side === "yes"
                  ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setSide("no")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                side === "no"
                  ? "border-rose-400/35 bg-rose-400/10 text-rose-200"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              NO
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Contracts
          </div>
          <input
            value={count}
            onChange={(e) => setCount(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-lg border border-border/20 bg-panel/30 px-3 text-sm text-text/85 outline-none shadow-plush placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/20"
            placeholder="1"
          />
        </label>

        <label className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Limit Price (¢)
          </div>
          <input
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-lg border border-border/20 bg-panel/30 px-3 text-sm text-text/85 outline-none shadow-plush placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/20"
            placeholder="50"
          />
          <div className="mt-1 text-[11px] text-muted">1–99 (cents)</div>
        </label>
      </div>

      {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}

      <button
        type="button"
        onClick={() => void place()}
        disabled={state === "placing"}
        className={cn(
          "mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-plush",
          state === "placing"
            ? "bg-panel2/40 text-text/60"
            : "bg-accent text-white hover:brightness-105",
        )}
      >
        {state === "placing"
          ? "Placing…"
          : state === "success"
            ? "Placed"
            : state === "error"
              ? "Try again"
              : `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`}
      </button>
    </div>
  );
}
