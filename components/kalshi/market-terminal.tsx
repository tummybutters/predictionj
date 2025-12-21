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

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 100)}¢`;
}

function formatAge(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type TerminalState = {
  usd: { balance: number | null; updated_at: string } | null;
  positions: Array<{
    token_id: string;
    outcome: string | null;
    shares: number;
    avg_price: number | null;
    current_price: number | null;
    value: number | null;
    pnl: number | null;
    pnl_pct: number | null;
    updated_at: string;
  }>;
  orders: Array<{
    order_id: string;
    token_id: string | null;
    side: string | null;
    price: number | null;
    size: number | null;
    status: string | null;
    created_at: string | null;
    last_seen_at: string;
  }>;
  sync: { status: string; started_at: string; finished_at: string | null; error: string | null } | null;
};

function parseTerminalState(data: unknown): TerminalState | null {
  const d = asRecord(data);
  if (!d || d.ok !== true) return null;

  const usdRow = asRecord(d.usd);
  const usd =
    usdRow && ("balance" in usdRow || "updated_at" in usdRow)
      ? {
          balance: asNumber(usdRow.balance) ?? null,
          updated_at: String(usdRow.updated_at ?? ""),
        }
      : null;

  const positionsRaw = Array.isArray(d.positions) ? d.positions : [];
  const positions = positionsRaw
    .map((row) => {
      const r = asRecord(row) ?? {};
      const token_id = String(r.token_id ?? "");
      if (!token_id) return null;
      return {
        token_id,
        outcome: asString(r.outcome),
        shares: asNumber(r.shares) ?? 0,
        avg_price: asNumber(r.avg_price),
        current_price: asNumber(r.current_price),
        value: asNumber(r.value),
        pnl: asNumber(r.pnl),
        pnl_pct: asNumber(r.pnl_pct),
        updated_at: String(r.updated_at ?? ""),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const ordersRaw = Array.isArray(d.orders) ? d.orders : [];
  const orders = ordersRaw
    .map((row) => {
      const r = asRecord(row) ?? {};
      const order_id = String(r.order_id ?? "");
      if (!order_id) return null;
      return {
        order_id,
        token_id: r.token_id == null ? null : String(r.token_id),
        side: asString(r.side),
        price: asNumber(r.price),
        size: asNumber(r.size),
        status: asString(r.status),
        created_at: asString(r.created_at),
        last_seen_at: String(r.last_seen_at ?? ""),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const syncRow = asRecord(d.sync);
  const sync =
    syncRow && (syncRow.status != null || syncRow.started_at != null)
      ? {
          status: String(syncRow.status ?? ""),
          started_at: String(syncRow.started_at ?? ""),
          finished_at: asString(syncRow.finished_at),
          error: asString(syncRow.error),
        }
      : null;

  return { usd, positions, orders, sync };
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
  const [orderType, setOrderType] = React.useState<"limit" | "market">("limit");
  const [count, setCount] = React.useState("1");
  const [priceCents, setPriceCents] = React.useState("50");
  const [state, setState] = React.useState<"idle" | "placing" | "success" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  const [accountState, setAccountState] = React.useState<TerminalState | null>(null);

  const bid = getNumberField(market, side === "yes" ? "yes_bid" : "no_bid");
  const ask = getNumberField(market, side === "yes" ? "yes_ask" : "no_ask");

  async function refreshState() {
    try {
      const res = await fetch(`/api/kalshi/state?ticker=${encodeURIComponent(ticker)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as unknown;
      const parsed = parseTerminalState(data);
      if (!parsed) return;
      setAccountState(parsed);
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    void refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/kalshi/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Sync failed (${res.status})`);
      await refreshState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function place() {
    const countInt = toInt(count);
    const priceInt = toInt(priceCents);
    if (!countInt || countInt < 1) return;
    if (orderType === "limit" && (!priceInt || priceInt < 1 || priceInt > 99)) return;

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
          type: orderType,
          ...(orderType === "limit" ? { price_cents: priceInt } : {}),
          time_in_force: orderType === "market" ? "immediate_or_cancel" : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Order failed (${res.status})`);
      setState("success");
      await refreshState();
      window.setTimeout(() => setState("idle"), 1400);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to place order");
      window.setTimeout(() => setState("idle"), 2200);
    }
  }

  async function cancel(orderId: string) {
    if (!orderId) return;
    setState("placing");
    setError(null);
    try {
      const res = await fetch("/api/kalshi/order", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Cancel failed (${res.status})`);
      await refreshState();
      setState("success");
      window.setTimeout(() => setState("idle"), 1000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to cancel order");
      window.setTimeout(() => setState("idle"), 2200);
    }
  }

  const positionsForTicker = (accountState?.positions ?? []).filter((p) =>
    p.token_id.toLowerCase().startsWith(`${ticker.toLowerCase()}:`),
  );
  const ordersForTicker = (accountState?.orders ?? []).filter((o) =>
    (o.token_id ?? "").toLowerCase().startsWith(`${ticker.toLowerCase()}:`),
  );

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
          <div className="mt-2">
            Cash{" "}
            <span className="font-mono text-text/80">
              {formatUsd(accountState?.usd?.balance)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing}
            className={cn(
              "mt-2 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold shadow-plush",
              syncing
                ? "border-border/15 bg-panel/40 text-muted"
                : "border-border/20 bg-panel/55 text-text/70 hover:bg-panel/70",
            )}
          >
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
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

        <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Type
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setOrderType("limit")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                orderType === "limit"
                  ? "border-accent/35 bg-accent/15 text-text"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              Limit
            </button>
            <button
              type="button"
              onClick={() => setOrderType("market")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold shadow-plush",
                orderType === "market"
                  ? "border-accent/35 bg-accent/15 text-text"
                  : "border-border/20 bg-panel/30 text-text/70 hover:bg-panel/45",
              )}
            >
              Market
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

        {orderType === "limit" ? (
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
        ) : (
          <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Market Order
            </div>
            <div className="mt-2 text-sm text-text/70">
              Executes against the book (IOC).
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Best-effort price:{" "}
              <span className="font-mono text-text/80">{formatCents(ask ?? bid ?? null)}</span>
            </div>
          </div>
        )}
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
              : `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()} (${orderType})`}
      </button>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Your Position
            </div>
            <div className="text-[11px] text-muted">
              Updated {formatAge(positionsForTicker[0]?.updated_at ?? null)}
            </div>
          </div>
          {positionsForTicker.length ? (
            <div className="mt-2 space-y-2">
              {positionsForTicker.map((p) => (
                <div
                  key={p.token_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/15 bg-panel/30 px-3 py-2 text-sm"
                >
                  <div className="font-semibold text-text/80">
                    {(p.token_id.split(":")[1] ?? "").toUpperCase()}{" "}
                    <span className="text-muted">x</span>{" "}
                    <span className="font-mono">{p.shares}</span>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>
                      Avg <span className="font-mono text-text/80">{formatPrice(p.avg_price)}</span>
                    </div>
                    <div>
                      Mark{" "}
                      <span className="font-mono text-text/80">{formatPrice(p.current_price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">No position for this ticker yet.</div>
          )}
        </div>

        <div className="rounded-xl border border-border/15 bg-panel2/35 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Open Orders
            </div>
            <div className="text-[11px] text-muted">
              Seen {formatAge(ordersForTicker[0]?.last_seen_at ?? null)}
            </div>
          </div>
          {ordersForTicker.length ? (
            <div className="mt-2 space-y-2">
              {ordersForTicker.slice(0, 6).map((o) => (
                <div
                  key={o.order_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/15 bg-panel/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text/80">
                      {o.side ?? "ORDER"}{" "}
                      <span className="font-mono text-text/70">{formatPrice(o.price)}</span>{" "}
                      <span className="text-muted">×</span>{" "}
                      <span className="font-mono text-text/70">{o.size ?? "—"}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {o.order_id.slice(0, 10)}… • {o.status ?? "resting"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancel(o.order_id)}
                    className="rounded-lg border border-border/20 bg-panel2/35 px-2 py-1 text-[11px] font-semibold text-text/75 shadow-plush hover:bg-panel2/50"
                  >
                    Cancel
                  </button>
                </div>
              ))}
              {ordersForTicker.length > 6 ? (
                <div className="text-[11px] text-muted">
                  +{ordersForTicker.length - 6} more (sync to refresh)
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">No resting orders for this ticker.</div>
          )}
        </div>
      </div>
    </div>
  );
}
