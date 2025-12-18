"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { PaperPositionControls } from "@/app/predictions/_components/paper-position-controls";
import { PredictionForecastControls } from "@/app/predictions/_components/prediction-forecast-controls";
import { PredictionLineControls } from "@/app/predictions/_components/prediction-line-controls";

type PredictionLite = {
  id: string;
  claim: string;
  confidence: number;
  reference_line: number;
  resolution_date: string; // YYYY-MM-DD
  updated_at: string;
};

type PositionSummary = {
  yes_stake: number;
  no_stake: number;
  total_stake: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parseDateOnly(value: string): Date | null {
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12, 0, 0));
}

function addMonthsUTC(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1, 12, 0, 0));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(d: Date): string {
  return d.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatPercent(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

function ppEdge(a: number, b: number): string {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  const pp = (a - b) * 100;
  const rounded = Math.round(pp * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}pp`;
}

function daysUntil(resolutionDate: string): number | null {
  const d = parseDateOnly(resolutionDate);
  if (!d) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
  return Math.round((target - start) / 86_400_000);
}

function startOfWeekMondayIndex(weekdaySunday0: number): number {
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  return (weekdaySunday0 + 6) % 7;
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("tab-flap", active && "active")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CalendarMonth({
  month,
  countsByDate,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  countsByDate: Record<string, number>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const year = month.getUTCFullYear();
  const m = month.getUTCMonth();
  const first = new Date(Date.UTC(year, m, 1, 12, 0, 0));
  const daysInMonth = new Date(Date.UTC(year, m + 1, 0, 12, 0, 0)).getUTCDate();
  const startOffset = startOfWeekMondayIndex(first.getUTCDay());

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl border border-border/10 bg-panel/30 p-3">
      <div className="grid grid-cols-7 gap-1 px-1 text-[11px] text-muted">
        {dayLabels.map((d) => (
          <div key={d} className="py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`spacer-${i}`} className="h-12 rounded-xl" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = countsByDate[date] ?? 0;
          const active = selectedDate === date;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "group relative h-12 rounded-xl border text-left transition-[background-color,border-color,transform] duration-150",
                active
                  ? "border-accent/25 bg-panel/70 shadow-glass"
                  : "border-border/10 bg-panel/20 hover:-translate-y-[1px] hover:border-accent/20 hover:bg-panel/40",
              )}
            >
              <div className="flex h-full flex-col justify-between px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-text/85">{day}</div>
                  {count ? (
                    <div className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                      {count}
                    </div>
                  ) : null}
                </div>
                <div className="text-[10px] text-muted">
                  {count ? "Due" : "\u00A0"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatrixView({
  predictions,
  selectedId,
  onSelect,
}: {
  predictions: PredictionLite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const width = 720;
  const height = 320;
  const padX = 46;
  const padY = 18;

  const points = predictions
    .map((p) => {
      const d = daysUntil(p.resolution_date);
      if (d === null) return null;
      return { id: p.id, x: d, y: clamp(p.confidence, 0, 1), y2: clamp(p.reference_line, 0, 1) };
    })
    .filter(Boolean) as Array<{ id: string; x: number; y: number; y2: number }>;

  if (points.length === 0) {
    return <EmptyState className="rounded-2xl">Not enough data to plot.</EmptyState>;
  }

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const xScale = (x: number) => {
    if (maxX === minX) return padX;
    return padX + ((x - minX) / (maxX - minX)) * (width - padX * 2);
  };
  const yScale = (y: number) => padY + (1 - y) * (height - padY * 2);

  return (
    <div className="rounded-2xl border border-border/10 bg-panel/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs text-muted">
          X = days to resolve · Y = probability · ghost = line
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full" role="img" aria-label="Claims matrix">
        <line x1={padX} y1={yScale(0)} x2={width - padX} y2={yScale(0)} stroke="rgba(255,255,255,0.06)" />
        <line x1={padX} y1={yScale(0.5)} x2={width - padX} y2={yScale(0.5)} stroke="rgba(255,255,255,0.06)" />
        <line x1={padX} y1={yScale(1)} x2={width - padX} y2={yScale(1)} stroke="rgba(255,255,255,0.06)" />

        {points.map((p) => {
          const x = xScale(p.x);
          const y = yScale(p.y);
          const y2 = yScale(p.y2);
          const active = p.id === selectedId;

          return (
            <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: "pointer" }}>
              <line x1={x} y1={y2} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />
              <circle cx={x} cy={y2} r={4.5} fill="rgba(255,255,255,0.12)" />
              <circle
                cx={x}
                cy={y}
                r={active ? 7.5 : 6}
                fill={active ? "rgb(var(--accent))" : "rgba(255,255,255,0.18)"}
                stroke={active ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)"}
                strokeWidth={1}
              />
            </g>
          );
        })}

        <text x={padX} y={height - 6} fontSize={11} fill="rgba(255,255,255,0.35)">
          {minX}d
        </text>
        <text x={width - padX} y={height - 6} fontSize={11} textAnchor="end" fill="rgba(255,255,255,0.35)">
          {maxX}d
        </text>
      </svg>
    </div>
  );
}

function ProgressView({
  predictions,
}: {
  predictions: PredictionLite[];
}) {
  const now = Date.now();
  const withDates = predictions
    .map((p) => {
      const d = parseDateOnly(p.resolution_date);
      if (!d) return null;
      return { ...p, d };
    })
    .filter(Boolean) as Array<PredictionLite & { d: Date }>;

  const stale = withDates
    .map((p) => {
      const ts = new Date(p.updated_at).getTime();
      if (!Number.isFinite(ts)) return null;
      const days = Math.round((now - ts) / 86_400_000);
      return { id: p.id, claim: p.claim, days };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.days ?? 0) - (a!.days ?? 0))
    .slice(0, 6) as Array<{ id: string; claim: string; days: number }>;

  const avgP =
    predictions.length > 0
      ? predictions.reduce((sum, p) => sum + clamp(p.confidence, 0, 1), 0) / predictions.length
      : 0;
  const avgAbsEdge =
    predictions.length > 0
      ? predictions.reduce((sum, p) => sum + Math.abs(clamp(p.confidence, 0, 1) - clamp(p.reference_line, 0, 1)), 0) /
      predictions.length
      : 0;

  const buckets: Record<string, number> = {};
  for (const p of withDates) {
    const key = monthKey(startOfMonthUTC(p.d));
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  const bucketKeys = Object.keys(buckets).sort();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-border/10 bg-panel/30 p-3">
        <div className="text-xs text-muted">Overview</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill className="px-2 py-1">
            <span className="text-muted">Open</span>{" "}
            <span className="font-mono">{predictions.length}</span>
          </Pill>
          <Pill className="px-2 py-1">
            <span className="text-muted">Avg %</span>{" "}
            <span className="font-mono">{formatPercent(avgP)}</span>
          </Pill>
          <Pill className="px-2 py-1">
            <span className="text-muted">Avg |edge|</span>{" "}
            <span className="font-mono">{ppEdge(avgP + avgAbsEdge, avgP)}</span>
          </Pill>
        </div>

        <div className="mt-4">
          <div className="text-xs text-muted">Resolve distribution</div>
          {bucketKeys.length ? (
            <div className="mt-2 space-y-2">
              {bucketKeys.slice(0, 8).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3 text-xs">
                  <div className="font-mono text-muted">{k}</div>
                  <div className="flex-1 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-accent/30"
                      style={{ width: `${clamp((buckets[k] / predictions.length) * 100, 6, 100)}%` }}
                    />
                  </div>
                  <div className="font-mono text-text/80">{buckets[k]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">No dates available.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/10 bg-panel/30 p-3">
        <div className="text-xs text-muted">Needs review</div>
        {stale.length ? (
          <ol className="mt-2 space-y-2">
            {stale.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/10 bg-panel/25 px-3 py-2">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-sm font-medium text-text/85">{s.claim}</div>
                  <div className="mt-1 text-xs text-muted">Updated {s.days}d ago</div>
                </div>
                <Link href={`/predictions/${s.id}`}>
                  <Button size="sm" variant="secondary" className="h-8">
                    Open
                  </Button>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-2 text-sm text-muted">All caught up.</div>
        )}
      </div>
    </div>
  );
}

function SelectedBar({
  prediction,
  position,
  onQuickUpdate,
}: {
  prediction: PredictionLite;
  position?: PositionSummary;
  onQuickUpdate: () => void;
}) {
  const due = prediction.resolution_date;
  const d = daysUntil(due);
  const status = d === null ? "—" : d < 0 ? "Overdue" : d === 0 ? "Today" : `${d}d`;
  const edge = prediction.confidence - prediction.reference_line;

  return (
    <div className="rounded-2xl border border-border/10 bg-panel/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted">Selected</div>
          <div className="mt-0.5 line-clamp-1 text-sm font-semibold text-text/90">
            {prediction.claim}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="font-mono">Due {due}</span>
            <span className="font-mono">{status}</span>
            <span className="font-mono">My {formatPercent(prediction.confidence)}</span>
            <span className="font-mono">
              Edge{" "}
              <span className={edge >= 0 ? "text-accent" : "text-red-300"}>
                {ppEdge(prediction.confidence, prediction.reference_line)}
              </span>
            </span>
            {position?.total_stake ? (
              <span className="font-mono">Pos {Math.round(position.total_stake)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={onQuickUpdate}>
            Quick update
          </Button>
          <Link href={`/predictions/${prediction.id}`}>
            <Button size="sm" variant="secondary" className="h-8">
              Open
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickUpdateDrawer({
  open,
  onClose,
  prediction,
  accountBalance,
}: {
  open: boolean;
  onClose: () => void;
  prediction: PredictionLite | undefined;
  accountBalance: number;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && prediction ? (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 cursor-default bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "fixed right-0 top-0 z-50 h-dvh w-full max-w-[460px]",
              "border-l border-border/10 bg-panel/60 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Quick update"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/10 px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs text-muted">Quick update</div>
                <div className="mt-0.5 line-clamp-1 text-sm font-semibold text-text/90">
                  {prediction.claim}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/predictions/${prediction.id}`}>
                  <Button size="sm" variant="secondary" className="h-8">
                    Open
                  </Button>
                </Link>
                <Button size="sm" variant="secondary" className="h-8" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            <div className="h-[calc(100dvh-56px)] overflow-auto px-4 py-4">
              <PredictionForecastControls
                predictionId={prediction.id}
                currentProbability={prediction.confidence}
              />

              <details className="mt-4 rounded-2xl border border-border/10 bg-panel/25 px-3 py-2">
                <summary className="cursor-pointer select-none text-sm font-medium text-text/85">
                  Advanced
                </summary>
                <div className="mt-3 space-y-4 pb-2">
                  <PredictionLineControls
                    predictionId={prediction.id}
                    currentLine={prediction.reference_line}
                  />
                  <PaperPositionControls
                    predictionId={prediction.id}
                    line={Number.isFinite(prediction.reference_line) ? prediction.reference_line : 0.5}
                    availableBalance={accountBalance}
                  />
                </div>
              </details>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function ClaimsVisualize({
  predictions,
  positionsByPredictionId,
  accountBalance,
  className,
}: {
  predictions: PredictionLite[];
  positionsByPredictionId: Record<string, PositionSummary | undefined>;
  accountBalance: number;
  className?: string;
}) {
  const [tab, setTab] = React.useState<"calendar" | "matrix" | "progress">("calendar");
  const sorted = React.useMemo(() => {
    return predictions.slice().sort((a, b) => (a.resolution_date < b.resolution_date ? -1 : 1));
  }, [predictions]);

  const [selectedId, setSelectedId] = React.useState<string | null>(() => sorted[0]?.id ?? null);
  const selected = React.useMemo(
    () => (selectedId ? sorted.find((p) => p.id === selectedId) : undefined) ?? sorted[0],
    [selectedId, sorted],
  );

  const [month, setMonth] = React.useState<Date>(() => {
    const d = selected ? parseDateOnly(selected.resolution_date) : null;
    return startOfMonthUTC(d ?? new Date());
  });
  const [direction, setDirection] = React.useState(1);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(() => selected?.resolution_date ?? null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    if (!selected) return;
    setSelectedDate(selected.resolution_date);
    const d = parseDateOnly(selected.resolution_date);
    if (!d) return;
    const nextMonth = startOfMonthUTC(d);
    if (monthKey(nextMonth) !== monthKey(month)) {
      const diff = (nextMonth.getUTCFullYear() - month.getUTCFullYear()) * 12 + (nextMonth.getUTCMonth() - month.getUTCMonth());
      setDirection(diff >= 0 ? 1 : -1);
      setMonth(nextMonth);
    }
  }, [month, selected]);

  React.useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current[selectedId];
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, tab]);

  const countsByDate = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of sorted) {
      const key = p.resolution_date;
      if (!key) continue;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [sorted]);

  const byDate = React.useMemo(() => {
    const map: Record<string, PredictionLite[]> = {};
    for (const p of sorted) {
      const key = p.resolution_date;
      if (!key) continue;
      (map[key] ??= []).push(p);
    }
    return map;
  }, [sorted]);

  const sidebar = (
    <InsetPanel className="rounded-2xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted">Claims</div>
        <Pill className="px-2 py-1">
          <span className="font-mono">{sorted.length}</span>
        </Pill>
      </div>
      <div className="mt-2 max-h-[420px] space-y-2 overflow-auto pr-1 md:max-h-[520px]">
        {sorted.map((p) => {
          const active = p.id === selected?.id;
          return (
            <button
              key={p.id}
              ref={(el) => {
                itemRefs.current[p.id] = el;
              }}
              type="button"
              onClick={() => {
                setSelectedId(p.id);
                setSelectedDate(p.resolution_date);
                const d = parseDateOnly(p.resolution_date);
                if (d) {
                  const nextMonth = startOfMonthUTC(d);
                  const diff =
                    (nextMonth.getUTCFullYear() - month.getUTCFullYear()) * 12 +
                    (nextMonth.getUTCMonth() - month.getUTCMonth());
                  if (diff !== 0) {
                    setDirection(diff >= 0 ? 1 : -1);
                    setMonth(nextMonth);
                  }
                }
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-left transition-[transform,background-color,border-color,box-shadow] duration-150",
                active
                  ? "border-accent/25 bg-panel/70 shadow-glass"
                  : "border-border/10 bg-panel/25 hover:-translate-y-[1px] hover:border-accent/20 hover:bg-panel/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-sm font-medium text-text/90">{p.claim}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="font-mono">{p.resolution_date}</span>
                    <span className="font-mono">My {formatPercent(p.confidence)}</span>
                  </div>
                </div>
                <div className={cn(
                  "shrink-0 font-mono text-[11px]",
                  p.confidence - p.reference_line >= 0 ? "text-accent" : "text-red-300",
                )}>
                  {ppEdge(p.confidence, p.reference_line)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </InsetPanel>
  );

  const calendar = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-text/90">{formatMonth(month)}</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => {
              setDirection(-1);
              setMonth((m) => addMonthsUTC(m, -1));
            }}
          >
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => {
              setDirection(1);
              setMonth((m) => addMonthsUTC(m, 1));
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={monthKey(month)}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <CalendarMonth
            month={month}
            countsByDate={countsByDate}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              const items = byDate[date];
              if (items?.length) setSelectedId(items[0].id);
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (sorted.length === 0) {
    return (
      <Panel className={cn("p-4", className)}>
        <EmptyState>No predictions yet.</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel className={cn("p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted">Visualize</div>
          <div className="mt-0.5 text-sm font-semibold text-text/90">
            Flip views, same claims
          </div>
        </div>
        <div className="tab-flap-container">
          <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
            Calendar
          </TabButton>
          <TabButton active={tab === "matrix"} onClick={() => setTab("matrix")}>
            Matrix
          </TabButton>
          <TabButton active={tab === "progress"} onClick={() => setTab("progress")}>
            Progress
          </TabButton>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[300px_1fr]">
        {sidebar}

        <div className="min-w-0">
          {selected ? (
            <SelectedBar
              prediction={selected}
              position={positionsByPredictionId[selected.id]}
              onQuickUpdate={() => setDrawerOpen(true)}
            />
          ) : null}
          <div className="mt-3">
            {tab === "calendar" ? (
              calendar
            ) : tab === "matrix" ? (
              <MatrixView predictions={sorted} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            ) : (
              <ProgressView predictions={sorted} />
            )}
          </div>
        </div>
      </div>

      <QuickUpdateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        prediction={selected}
        accountBalance={accountBalance}
      />
    </Panel>
  );
}
