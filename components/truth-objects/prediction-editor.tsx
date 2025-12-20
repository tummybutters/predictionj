"use client";

import * as React from "react";

import type { TruthObjectRow } from "@/db/truth_objects";
import { cn } from "@/lib/cn";
import { Pill } from "@/components/ui/pill";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { updateTruthObjectAction } from "@/app/journal/_actions/truth-objects";

type Outcome = { key: string; label: string };

type PredictionMetadata = {
  market?: { question?: string; outcomes?: Outcome[] };
  position?: { initial_probability?: number | null; current_probability?: number | null };
  timing?: { close_at?: string };
  resolution?: { criteria?: string; source_urls?: string[] };
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v as string[];
}

function asOutcomeArray(v: unknown): Outcome[] | null {
  if (!Array.isArray(v)) return null;
  const out: Outcome[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") return null;
    const anyItem = item as { key?: unknown; label?: unknown };
    if (typeof anyItem.key !== "string" || typeof anyItem.label !== "string") return null;
    out.push({ key: anyItem.key, label: anyItem.label });
  }
  return out;
}

function parseMetadata(raw: unknown): PredictionMetadata {
  const m = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const market = m.market && typeof m.market === "object" ? (m.market as Record<string, unknown>) : {};
  const position =
    m.position && typeof m.position === "object" ? (m.position as Record<string, unknown>) : {};
  const timing = m.timing && typeof m.timing === "object" ? (m.timing as Record<string, unknown>) : {};
  const resolution =
    m.resolution && typeof m.resolution === "object"
      ? (m.resolution as Record<string, unknown>)
      : {};

  return {
    market: {
      question: asString(market.question) ?? "",
      outcomes:
        asOutcomeArray(market.outcomes) ?? [
          { key: "YES", label: "Yes" },
          { key: "NO", label: "No" },
        ],
    },
    position: {
      initial_probability: asNumber(position.initial_probability) ?? null,
      current_probability: asNumber(position.current_probability) ?? null,
    },
    timing: {
      close_at: asString(timing.close_at) ?? "",
    },
    resolution: {
      criteria: asString(resolution.criteria) ?? "",
      source_urls: asStringArray(resolution.source_urls) ?? [],
    },
  };
}

function formatPercent(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(clamp01(v) * 100)}%`;
}

export function PredictionEditor({ object }: { object: TruthObjectRow }) {
  const parsed = React.useMemo(() => parseMetadata(object.metadata), [object.metadata]);

  const [title, setTitle] = React.useState(object.title ?? "");
  const [body, setBody] = React.useState(object.body ?? "");
  const [question, setQuestion] = React.useState(parsed.market?.question ?? "");
  const [probability, setProbability] = React.useState<number>(
    parsed.position?.current_probability ??
      parsed.position?.initial_probability ??
      0.5,
  );
  const [closeAt, setCloseAt] = React.useState(parsed.timing?.close_at ?? "");
  const [criteria, setCriteria] = React.useState(parsed.resolution?.criteria ?? "");
  const [sourcesText, setSourcesText] = React.useState((parsed.resolution?.source_urls ?? []).join("\n"));

  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveSeq = React.useRef(0);

  React.useEffect(() => {
    const next = parseMetadata(object.metadata);
    setTitle(object.title ?? "");
    setBody(object.body ?? "");
    setQuestion(next.market?.question ?? "");
    setProbability(
      next.position?.current_probability ?? next.position?.initial_probability ?? 0.5,
    );
    setCloseAt(next.timing?.close_at ?? "");
    setCriteria(next.resolution?.criteria ?? "");
    setSourcesText((next.resolution?.source_urls ?? []).join("\n"));
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id]);

  const sources = React.useMemo(() => {
    return sourcesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [sourcesText]);

  const percent = Math.round(clamp01(probability) * 100);

  React.useEffect(() => {
    const seq = ++saveSeq.current;
    setSaveState("saving");

    const handle = window.setTimeout(async () => {
      try {
        const prev = parseMetadata(object.metadata);
        const next: PredictionMetadata = {
          market: {
            question,
            outcomes:
              prev.market?.outcomes && prev.market.outcomes.length
                ? prev.market.outcomes
                : [
                    { key: "YES", label: "Yes" },
                    { key: "NO", label: "No" },
                  ],
          },
          position: {
            initial_probability:
              prev.position?.initial_probability ?? clamp01(probability),
            current_probability: clamp01(probability),
          },
          timing: { close_at: closeAt },
          resolution: { criteria, source_urls: sources },
        };

        await updateTruthObjectAction({
          id: object.id,
          patch: {
            title,
            body,
            metadata: { ...(object.metadata ?? {}), ...next },
          },
        });
        if (saveSeq.current !== seq) return;
        setSaveState("saved");
      } catch {
        if (saveSeq.current !== seq) return;
        setSaveState("error");
      }
    }, 500);

    return () => window.clearTimeout(handle);
  }, [body, closeAt, criteria, object.id, object.metadata, probability, question, sources, title]);

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">Prediction</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill className="px-2 py-1 font-mono text-[11px] text-text/80" tone="neutral">
                @{object.handle}
              </Pill>
              <Pill tone="accent" className="px-2 py-1 font-mono text-[11px]">
                {formatPercent(clamp01(probability))}
              </Pill>
              <Pill
                tone={saveState === "error" ? "danger" : saveState === "saved" ? "positive" : "neutral"}
                className={cn("px-2 py-1 font-mono text-[11px]", saveState === "idle" && "opacity-80")}
                aria-live="polite"
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                      ? "Save failed"
                      : "Ready"}
              </Pill>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs font-semibold text-muted">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short name"
              className={cn(
                "mt-2 h-10 w-full rounded-2xl border border-border/20 bg-panel2/35 px-4 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Question</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will X happen by date Y?"
              className={cn(
                "mt-2 min-h-[110px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <InsetPanel className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text/85">Probability</div>
                  <div className="mt-1 text-xs text-muted">Your current estimate.</div>
                </div>
                <Pill tone="accent" className="px-2 py-1 font-mono text-[11px]">
                  {percent}%
                </Pill>
              </div>
              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={percent}
                  onChange={(e) => setProbability(Number(e.target.value) / 100)}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="mt-2 flex justify-between text-[11px] font-mono text-muted">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </InsetPanel>

            <InsetPanel className="p-4">
              <div className="text-sm font-semibold text-text/85">Close date</div>
              <div className="mt-1 text-xs text-muted">When you want it judged.</div>
              <input
                type="date"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
                className={cn(
                  "mt-3 h-10 w-full rounded-2xl border border-border/20 bg-panel2/35 px-4 text-sm text-text/85 outline-none shadow-inset",
                  "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
                )}
              />
            </InsetPanel>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Resolution criteria</div>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Resolves YES if … (be specific)."
              className={cn(
                "mt-2 min-h-[120px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Resolution sources (one per line)</div>
            <textarea
              value={sourcesText}
              onChange={(e) => setSourcesText(e.target.value)}
              placeholder="https://…"
              className={cn(
                "mt-2 min-h-[90px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Notes</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Reasoning, evidence, and updates…"
              className={cn(
                "mt-2 min-h-[240px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
