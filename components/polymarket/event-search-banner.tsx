"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { PolymarketEventCarousel } from "@/components/polymarket/event-carousel";
import styles from "@/components/polymarket/event-search.module.css";
import Link from "next/link";

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

function ChevronUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m5.5 12.5 4.5-4.5 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 15a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13.6 13.6 17 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PolymarketEventSearchBanner() {
  const [query, setQuery] = React.useState("");
  const [trending, setTrending] = React.useState<GammaEventLite[]>([]);
  const [results, setResults] = React.useState<GammaEventLite[]>([]);
  const [searchStatus, setSearchStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [trendingStatus, setTrendingStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [carouselOpen, setCarouselOpen] = React.useState(true);
  const [resultsOpen, setResultsOpen] = React.useState(false);

  const latestSearchRequestId = React.useRef(0);
  const latestTrendingRequestId = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("pj_polymarket_carousel_open");
      if (raw === "0") setCarouselOpen(false);
    } catch {
      // Ignore.
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("pj_polymarket_carousel_open", carouselOpen ? "1" : "0");
    } catch {
      // Ignore.
    }
  }, [carouselOpen]);

  React.useEffect(() => {
    const requestId = ++latestTrendingRequestId.current;
    setTrendingStatus("loading");

    void (async () => {
      try {
        const res = await fetch(`/api/polymarket/trending?limit=14`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { events?: GammaEventLite[] };

        if (latestTrendingRequestId.current !== requestId) return;
        const next = (data.events ?? []).slice().sort((a, b) => score(b) - score(a));
        setTrending(next);
        setTrendingStatus("idle");
      } catch {
        if (latestTrendingRequestId.current !== requestId) return;
        setTrending([]);
        setTrendingStatus("error");
      }
    })();
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchStatus("idle");
      return;
    }

    const requestId = ++latestSearchRequestId.current;
    setSearchStatus("loading");

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/polymarket/search?q=${encodeURIComponent(q)}`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { events?: GammaEventLite[] };

        if (latestSearchRequestId.current !== requestId) return;
        setResults((data.events ?? []).slice(0, 10));
        setSearchStatus("idle");
      } catch {
        if (latestSearchRequestId.current !== requestId) return;
        setResults([]);
        setSearchStatus("error");
      }
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query]);

  React.useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setResultsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed !== query) setQuery(trimmed);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div ref={rootRef} className="glass-panel rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted">Trending</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted hover:text-text"
          onClick={() => setCarouselOpen((v) => !v)}
          aria-label={carouselOpen ? "Hide trending carousel" : "Show trending carousel"}
          title={carouselOpen ? "Hide trending carousel" : "Show trending carousel"}
        >
          {carouselOpen ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {carouselOpen ? (
        <div className="mt-2 rounded-2xl border border-border/30 bg-panel/20 p-2">
          {trendingStatus === "error" ? (
            <div className="rounded-xl border border-border/35 bg-panel/55 p-3 text-sm text-muted">
              Couldn’t load Polymarket events right now.
            </div>
          ) : (
            <PolymarketEventCarousel events={trending} paused={trendingStatus === "loading"} loop />
          )}
        </div>
      ) : null}

      <div className="mt-3">
        <div className="relative">
          <form onSubmit={handleSubmit} className={styles.container} role="search">
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              placeholder="Search Polymarket events…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) setResultsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setResultsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setResultsOpen(false);
              }}
              aria-label="Search Polymarket events"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
            />

            <button type="submit" className={styles.submit} aria-label="Search" title="Search">
              <SearchIcon className="h-[18px] w-[18px]" />
            </button>
          </form>

          {hasQuery && resultsOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 rounded-2xl border border-border/40 bg-panel/95 p-2 shadow-glass backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted">
                <span>Top results</span>
                {searchStatus === "loading" ? <span aria-live="polite">Loading…</span> : null}
              </div>

              {searchStatus === "error" ? (
                <div className="rounded-xl border border-border/35 bg-panel/55 p-3 text-sm text-muted">
                  Couldn’t load results.
                </div>
              ) : null}

              {searchStatus !== "loading" && results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/35 bg-panel/40 p-3 text-sm text-muted">
                  No events found.
                </div>
              ) : null}

              {results.length > 0 ? (
                <ol className="max-h-[340px] space-y-2 overflow-auto p-1">
                  {results.map((e) => {
                    const createHref = `/predictions?prefill=${encodeURIComponent(e.title)}`;

                    return (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/35 bg-panel/60 p-3 hover:bg-panel/70"
                      >
                        <Link
                          href={`/polymarket/events/${encodeURIComponent(e.slug)}`}
                          className="min-w-0 flex-1"
                          onClick={() => setResultsOpen(false)}
                        >
                          <div className="line-clamp-1 text-sm font-medium hover:underline">
                            {e.title}
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link href={`/polymarket/events/${encodeURIComponent(e.slug)}`}>
                            <Button variant="secondary" size="sm" className="h-8 px-2">
                              Details
                            </Button>
                          </Link>
                          <Link href={createHref} aria-label="Make prediction">
                            <Button size="sm" className="h-8 w-8 p-0">
                              +
                            </Button>
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
