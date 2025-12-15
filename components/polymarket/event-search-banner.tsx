"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PolymarketEventCarousel } from "@/components/polymarket/event-carousel";
import styles from "@/components/home/quick-capture.module.css";

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

function SparkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 2.5l1.4 4.3L15.7 8.2l-4.3 1.4L10 13.9 8.6 9.6 4.3 8.2l4.3-1.4L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 10h15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 2.5c2.1 2.1 3.3 4.8 3.3 7.5S12.1 15.4 10 17.5c-2.1-2.1-3.3-4.8-3.3-7.5S7.9 4.6 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PolymarketEventSearchBanner() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [events, setEvents] = React.useState<GammaEventLite[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [collapsed, setCollapsed] = React.useState(false);

  const latestRequestId = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const collapsedStorageKey = "pj_polymarket_search_collapsed";

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(collapsedStorageKey);
      setCollapsed(raw === "1");
    } catch {
      // Ignore.
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(collapsedStorageKey, collapsed ? "1" : "0");
    } catch {
      // Ignore.
    }
  }, [collapsed]);

  React.useEffect(() => {
    if (collapsed) return;
    inputRef.current?.focus();
  }, [collapsed]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed !== query) setQuery(trimmed);
  }

  if (collapsed) {
    return (
      <div className="glass-panel rounded-2xl px-2 py-1.5">
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl px-3 text-sm text-muted hover:bg-panel/35 hover:text-text"
          onClick={() => setCollapsed(false)}
          aria-label="Expand Polymarket search"
        >
          <span>Search Polymarket events</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSubmit} className={styles.container} role="search">
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search Polymarket events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search Polymarket events"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
          />

          <div className={styles.modes} aria-label="Shortcuts">
            <button
              type="button"
              className={styles.modeLabel}
              title="Trending"
              aria-label="Trending"
              onClick={() => setQuery("")}
            >
              <SparkIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className={styles.modeLabel}
              title="Explore Polymarket"
              aria-label="Explore Polymarket"
              onClick={() => router.push("/polymarket")}
            >
              <GlobeIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <button
            type="submit"
            className={styles.submit}
            aria-label="Search"
            title="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </form>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted hover:text-text"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse Polymarket search"
          title="Collapse"
        >
          <ChevronUpIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 text-xs text-muted">
        Use events as prompts; then turn one into your own prediction.
      </div>

      <div className="mt-3 space-y-2">
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
    </div>
  );
}
