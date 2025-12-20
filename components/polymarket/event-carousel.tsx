"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type GammaEventLite = {
  id: string;
  slug: string;
  title: string;
  endDate?: string;
};

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PolymarketEventCarousel({
  events,
  className,
  paused,
  loop = true,
}: {
  events: GammaEventLite[];
  paused?: boolean;
  loop?: boolean;
  className?: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const resumeTimeoutRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef<number | null>(null);
  const carryRef = React.useRef(0);

  const [isInteracting, setIsInteracting] = React.useState(false);

  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const items = React.useMemo(() => {
    const base = events.slice(0, 20);
    if (base.length === 0) return [];
    return loop ? base.concat(base) : base;
  }, [events, loop]);

  const stop = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const scheduleResume = React.useCallback(() => {
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsInteracting(false);
    }, 800);
  }, []);

  const start = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (prefersReducedMotion) return;
    if (paused) return;
    if (isInteracting) return;
    if (items.length <= 1) return;

    const speedPxPerSecond = 28;
    const speedPxPerMs = speedPxPerSecond / 1000;

    const tick = (ts: number) => {
      const node = scrollerRef.current;
      if (!node) return;

      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      carryRef.current += dt * speedPxPerMs;
      const px = Math.trunc(carryRef.current);
      if (px !== 0) {
        carryRef.current -= px;
        node.scrollLeft += px;

        if (loop) {
          const half = node.scrollWidth / 2;
          if (half > 0) {
            if (node.scrollLeft >= half) node.scrollLeft -= half;
            if (node.scrollLeft < 0) node.scrollLeft += half;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    stop();
    rafRef.current = requestAnimationFrame(tick);
  }, [isInteracting, items.length, loop, paused, prefersReducedMotion, stop]);

  React.useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  React.useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, []);

  const drag = React.useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startLeft: 0,
    captured: false,
    moved: false,
  });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      captured: false,
      moved: false,
    };
    setIsInteracting(true);
    stop();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el) return;
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.current.startX;
    if (!drag.current.captured && Math.abs(dx) > 6) {
      drag.current.captured = true;
      drag.current.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (!drag.current.captured) return;
    el.scrollLeft = drag.current.startLeft - dx;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el) return;
    if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;

    drag.current.active = false;
    try {
      if (drag.current.captured) el.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore.
    }

    scheduleResume();
  }

  const thin =
    "h-[64px] rounded-2xl border border-border/15 bg-panel2/55 px-3 py-2 shadow-inset backdrop-blur-md";

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "no-scrollbar flex w-full gap-2 overflow-x-auto select-none",
        "cursor-grab active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={() => {
        setIsInteracting(true);
        stop();
        scheduleResume();
      }}
      style={{ touchAction: "pan-x" }}
      aria-label="Trending events carousel"
    >
      {items.length === 0 ? (
        <div className={cn(thin, "flex w-full items-center justify-between")}>
          <div className="text-sm text-muted">No events.</div>
        </div>
      ) : (
        items.map((e, idx) => {
          const resolveBy = toDateInputValue(e.endDate);
          const createHref = `/journal/predictions?prefill=${encodeURIComponent(e.title)}${
            resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
          }`;

          return (
            <div
              key={`${e.id}-${idx}`}
              className={cn(thin, "group flex min-w-[320px] items-center justify-between gap-3")}
            >
              <Link
                href={`/markets/events/${encodeURIComponent(e.slug)}`}
                className="min-w-0 flex-1"
              >
                <div className="line-clamp-1 text-sm font-medium group-hover:underline">
                  {e.title}
                </div>
                <div className="mt-1 font-mono text-xs text-muted">
                  {resolveBy ? `Ends: ${resolveBy}` : "Tap for details"}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={createHref} aria-label="Make prediction from event">
                  <Button size="sm" className="h-9 w-9 p-0">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
