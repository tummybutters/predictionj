"use client";

import * as React from "react";

import { RetractableSearchBanner } from "@/components/search/retractable-search-banner";
import { Button } from "@/components/ui/button";
import { PolymarketEventCarousel } from "@/components/polymarket/event-carousel";

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
        <span>{query.trim() ? "Matches" : "Trending"}</span>
        {status === "loading" ? <span aria-live="polite">Loading…</span> : null}
      </div>

      {status === "error" ? (
        <div className="rounded-xl border border-border/25 bg-panel/35 p-3 text-sm text-muted">
          Couldn’t load Polymarket events right now.
        </div>
      ) : (
        <PolymarketEventCarousel
          events={events}
          paused={status === "loading" || Boolean(query.trim())}
          loop={!query.trim()}
        />
      )}
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
