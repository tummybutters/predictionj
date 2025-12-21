"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export type OpenOrder = {
  provider: "polymarket" | "kalshi";
  order_id: string;
  token_id: string | null;
  side: string | null;
  price: number | null;
  size: number | null;
  status: string | null;
  created_at: string | null;
  last_seen_at: string;
};

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  if (p > 0 && p < 1) return `${Math.round(p * 100)}¢`;
  return p.toFixed(2);
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

export function OpenOrdersTable({ orders }: { orders: OpenOrder[] }) {
  const [local, setLocal] = React.useState(() => orders);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setLocal(orders), [orders]);

  async function cancel(order: OpenOrder) {
    if (order.provider !== "kalshi") return;
    if (!confirm("Cancel this order?")) return;

    setBusy(order.order_id);
    setError(null);
    try {
      const res = await fetch("/api/kalshi/order", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.order_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Cancel failed (${res.status})`);
      setLocal((prev) => prev.filter((o) => o.order_id !== order.order_id));
      window.setTimeout(() => window.location.reload(), 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border/15 bg-panel/55 shadow-glass">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="text-sm font-semibold text-text/85">
          Open Orders <span className="text-muted">({local.length})</span>
        </div>
        <div className="text-xs text-muted">Seen {formatAge(local[0]?.last_seen_at ?? null)} ago</div>
      </div>

      {error ? <div className="px-5 pb-3 text-sm text-rose-300">{error}</div> : null}

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.55fr_0.6fr_0.5fr] gap-3 border-t border-border/15 bg-panel2/35 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <div>Market</div>
            <div>Side</div>
            <div className="text-right">Price</div>
            <div className="text-right">Size</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>

          <div className="divide-y divide-border/15">
            {local.map((o) => {
              const kalshiTicker = o.provider === "kalshi" ? (o.token_id ?? "").split(":")[0] : null;
              const href =
                o.provider === "kalshi" && kalshiTicker ? `/markets/kalshi/${encodeURIComponent(kalshiTicker)}` : null;
              return (
                <div
                  key={`${o.provider}-${o.order_id}`}
                  className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.55fr_0.6fr_0.5fr] items-center gap-3 px-5 py-3 text-sm text-text/70"
                >
                  <div className="min-w-0">
                    {href ? (
                      <Link href={href} className="block">
                        <div className="line-clamp-1 font-semibold text-text/85 hover:underline">
                          {kalshiTicker}
                        </div>
                        <div className="mt-1 text-xs text-muted">{o.order_id.slice(0, 10)}…</div>
                      </Link>
                    ) : (
                      <>
                        <div className="line-clamp-1 font-semibold text-text/85">
                          {o.token_id ?? "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted">{o.order_id.slice(0, 10)}…</div>
                      </>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-text/80">{o.side ?? "—"}</div>
                  <div className="text-right font-mono text-[12px]">{formatPrice(o.price)}</div>
                  <div className="text-right font-mono text-[12px]">{o.size ?? "—"}</div>
                  <div className="text-xs text-muted">{o.status ?? "—"}</div>

                  <div className="text-right">
                    {o.provider === "kalshi" ? (
                      <button
                        type="button"
                        onClick={() => void cancel(o)}
                        disabled={busy === o.order_id}
                        className={cn(
                          "rounded-lg border px-2 py-1 text-[11px] font-semibold shadow-plush",
                          busy === o.order_id
                            ? "border-border/15 bg-panel/40 text-muted"
                            : "border-border/20 bg-panel2/35 text-text/75 hover:bg-panel2/50",
                        )}
                      >
                        {busy === o.order_id ? "…" : "Cancel"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {local.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No open orders.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

