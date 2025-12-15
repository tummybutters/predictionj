"use client";

import * as React from "react";
import Link from "next/link";

import { RetractableSearchBanner } from "@/components/search/retractable-search-banner";
import { Button } from "@/components/ui/button";

type GammaEventLite = {
  id: string;
  slug: string;
  title: string;
  endDate?: string;
  volume24hr?: string;
  volume1wk?: string;
  volume1mo?: string;
  volume?: string;
};

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function score(e: GammaEventLite): number {
  return (
    toNumber(e.volume24hr) * 1000 +
    toNumber(e.volume1wk) * 100 +
    toNumber(e.volume1mo) * 10 +
    toNumber(e.volume)
  );
}

export function PolymarketEventSearchBanner() {
  const [query, setQuery] = React.useState("");
  const [events, setEvents] = React.useState<GammaEventLite[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");

  const latestRequestId = React.useRef(0);

  React.useEffect(() => {
    const requestId = ++latestRequestId.current;
    const q = query.trim();

    setStatus("loading");

    const handle = window.setTimeout(async () => {
      try {
        const url = q
          ? `/api/polymarket/search?q=${encodeURIComponent(q)}`
          : `/api/polymarket/trending?limit=5`;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { events?: GammaEventLite[] };

        if (latestRequestId.current !== requestId) return;

        const next = (data.events ?? []).slice();
        if (!q) next.sort((a, b) => score(b) - score(a));

        setEvents(next);
        setStatus("idle");
      } catch {
        if (latestRequestId.current !== requestId) return;
        setEvents([]);
        setStatus("error");
      }
    }, q ? 200 : 0);

    return () => window.clearTimeout(handle);
  }, [query]);

  const below = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>{query.trim() ? "Search results" : "Trending events"}</span>
        {status === "loading" ? <span aria-live="polite">Loading…</span> : null}
      </div>

      {status === "error" ? (
        <div className="rounded-xl border border-border/25 bg-panel/35 p-3 text-sm text-muted">
          Couldn’t load Polymarket events right now.
        </div>
      ) : null}

      {status !== "error" && events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/25 bg-panel/25 p-3 text-sm text-muted">
          No events found.
        </div>
      ) : null}

      {events.length > 0 ? (
        <ol className="space-y-2">
          {events.slice(0, 5).map((e) => {
            const resolveBy = toDateInputValue(e.endDate);
            const prefill = e.title;
            const createHref = `/predictions?prefill=${encodeURIComponent(prefill)}${
              resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
            }`;

            return (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/25 bg-panel/30 p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/polymarket/events/${encodeURIComponent(e.slug)}`}
                    className="block text-sm font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  {resolveBy ? (
                    <div className="mt-1 font-mono text-xs text-muted">
                      Ends: {resolveBy}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/polymarket/events/${encodeURIComponent(e.slug)}`}>
                    <Button variant="secondary" size="sm" className="h-8 px-2">
                      Details
                    </Button>
                  </Link>
                  <Link href={createHref}>
                    <Button size="sm" className="h-8 px-2">
                      Make prediction
                    </Button>
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );

  return (
    <RetractableSearchBanner
      query={query}
      onQueryChange={setQuery}
      placeholder="Search Polymarket events…"
      hint="Use events as prompts; then turn one into your own prediction."
      collapsedStorageKey="pj_polymarket_search_collapsed"
      right={
        query.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setQuery("")}
          >
            Clear
          </Button>
        ) : (
          <div className="hidden text-xs text-muted sm:block">Trending</div>
        )
      }
      below={below}
    />
  );
}
