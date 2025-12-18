"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { PolymarketEventCarousel } from "@/components/polymarket/event-carousel";
import styles from "@/components/polymarket/event-search.module.css";
import Link from "next/link";
import { cn } from "@/lib/cn";

type GammaEventLite = {
  id: string;
  slug: string;
  title: string;
  endDate?: string;
  image?: string;
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

export function PolymarketEventSearchBanner({
  density = "default",
  defaultCarouselOpen,
  storageKey = "pj_polymarket_carousel_open",
}: {
  density?: "default" | "compact";
  defaultCarouselOpen?: boolean;
  storageKey?: string;
}) {
  const compact = density === "compact";
  const [query, setQuery] = React.useState("");
  const [trending, setTrending] = React.useState<GammaEventLite[]>([]);
  const [results, setResults] = React.useState<GammaEventLite[]>([]);
  const [searchStatus, setSearchStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [trendingStatus, setTrendingStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [carouselOpen, setCarouselOpen] = React.useState(
    defaultCarouselOpen ?? !compact,
  );
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

  const latestSearchRequestId = React.useRef(0);
  const latestTrendingRequestId = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "0") setCarouselOpen(false);
      if (raw === "1") setCarouselOpen(true);
    } catch {
      // Ignore.
    }
  }, [storageKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, carouselOpen ? "1" : "0");
    } catch {
      // Ignore.
    }
  }, [carouselOpen, storageKey]);

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
        setResults((data.events ?? []).slice(0, 25));
        setSearchStatus("idle");
        setHasSearched(true);
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
  const showResults = (hasQuery || hasSearched) && resultsOpen;

  return (
    <Panel ref={rootRef} className={cn(compact ? "rounded-2xl p-3" : "rounded-3xl p-4", "!overflow-visible")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted">Trending</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "p-0 text-muted hover:text-text",
            compact ? "h-7 w-7" : "h-8 w-8",
          )}
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
        <InsetPanel className={cn(compact ? "mt-2 rounded-2xl p-2" : "mt-3 rounded-3xl p-2")}>
          {trendingStatus === "error" ? (
            <EmptyState className="rounded-2xl p-4">
              Couldn’t load Polymarket events right now.
            </EmptyState>
          ) : (
            <PolymarketEventCarousel events={trending} paused={trendingStatus === "loading"} loop />
          )}
        </InsetPanel>
      ) : null}

      <div className={cn(compact ? "mt-2" : "mt-3")}>
        <div className="relative">
          <form onSubmit={handleSubmit} className={styles.container} role="search">
            <input
              ref={inputRef}
              className={cn(styles.input, compact && styles.inputCompact)}
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

            <button
              type="submit"
              className={cn(styles.submit, compact && styles.submitCompact)}
              aria-label="Search"
              title="Search"
            >
              <SearchIcon className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]")} />
            </button>
          </form>

          {showResults ? (
            <Panel
              className={cn(
                "absolute left-0 right-0 z-50 border-border/15 bg-panel/95 shadow-glass backdrop-blur-md",
                compact
                  ? "top-[calc(100%+8px)] rounded-2xl p-2"
                  : "top-[calc(100%+10px)] rounded-3xl p-4",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1 text-xs text-muted">
                <span className="font-semibold uppercase tracking-wider">Search Results</span>
                {searchStatus === "loading" ? <span aria-live="polite">Searching…</span> : null}
              </div>

              {searchStatus === "error" ? (
                <EmptyState className="rounded-2xl p-8">Couldn’t load results. Please try again.</EmptyState>
              ) : null}

              {searchStatus !== "loading" && results.length === 0 ? (
                <EmptyState className="rounded-2xl p-8">No events found for "{query}".</EmptyState>
              ) : null}

              {results.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-3 overflow-auto p-1",
                    "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                    compact ? "max-h-[400px]" : "max-h-[600px]",
                  )}
                >
                  {Array.from({ length: 25 }).map((_, i) => {
                    const e = results[i];
                    if (!e) {
                      return (
                        <div key={`empty-${i}`} className="group relative flex flex-col h-full opacity-30 select-none">
                          <InsetPanel
                            className={cn(
                              "flex flex-col h-full rounded-2xl border-border/5 bg-panel/20",
                              "p-2.5",
                            )}
                          >
                            <div className="mb-2 aspect-video rounded-xl bg-muted/5 flex items-center justify-center">
                              <div className="h-6 w-6 rounded-full bg-muted/10" />
                            </div>
                            <div className="h-3 w-1/2 bg-muted/10 rounded mb-2" />
                            <div className="h-3 w-3/4 bg-muted/10 rounded mb-3" />
                            <div className="mt-auto h-7 w-full bg-muted/10 rounded-lg pt-2 border-t border-border/5" />
                          </InsetPanel>
                        </div>
                      );
                    }

                    const createHref = `/predictions?prefill=${encodeURIComponent(e.title)}`;

                    return (
                      <div key={e.id} className="group relative flex flex-col h-full">
                        <InsetPanel
                          className={cn(
                            "flex flex-col h-full rounded-2xl border-border/10 bg-panel/40 transition-all duration-300 ease-out hover:bg-panel/60 hover:shadow-lg hover:-translate-y-0.5",
                            "p-2.5",
                          )}
                        >
                          {e.image ? (
                            <div className="relative mb-2 aspect-video overflow-hidden rounded-xl bg-muted/20">
                              <img
                                src={e.image}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="mb-2 aspect-video rounded-xl bg-muted/10 flex items-center justify-center text-muted/30">
                              <SearchIcon className="h-6 w-6" />
                            </div>
                          )}

                          <Link
                            href={`/polymarket/events/${encodeURIComponent(e.slug)}`}
                            className="flex-1"
                            onClick={() => setResultsOpen(false)}
                          >
                            <div
                              className={cn(
                                "line-clamp-2 font-medium hover:text-accent transition-colors leading-tight mb-3",
                                compact ? "text-[12px]" : "text-[13px]",
                              )}
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          </Link>

                          <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-border/5">
                            <Link
                              href={`/polymarket/events/${encodeURIComponent(e.slug)}`}
                              className="flex-1"
                              onClick={() => setResultsOpen(false)}
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full h-7 text-[11px] px-0 rounded-lg bg-panel/50 border-none hover:bg-panel/80"
                              >
                                Details
                              </Button>
                            </Link>
                            <Link
                              href={createHref}
                              aria-label="Make prediction"
                              className="shrink-0"
                            >
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg shadow-sm"
                              >
                                +
                              </Button>
                            </Link>
                          </div>
                        </InsetPanel>
                      </div>
                    );
                  })}
                  {/* Fill up to 5x5 grid with empty slots if needed, but usually just showing results is better. 
                      However user asked for "filled to a 5x5 default". 
                      If we want exactly 25 slots, we could pad it. */}
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
