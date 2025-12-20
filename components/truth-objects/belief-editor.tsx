"use client";

import * as React from "react";

import type { TruthObjectRow } from "@/db/truth_objects";
import { cn } from "@/lib/cn";
import { Pill } from "@/components/ui/pill";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { updateTruthObjectAction } from "@/app/journal/_actions/truth-objects";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function confidenceLabel(v: number | null): { label: string; pct: number } {
  const pct = v == null ? 0 : Math.round(clamp01(v) * 100);
  const label = v == null ? "Unset" : pct >= 67 ? "High" : pct >= 45 ? "Medium" : "Low";
  return { label, pct };
}

export function BeliefEditor({ object }: { object: TruthObjectRow }) {
  const [title, setTitle] = React.useState(object.title ?? "");
  const [statement, setStatement] = React.useState(
    typeof object.metadata?.statement === "string" ? (object.metadata.statement as string) : "",
  );
  const [confidence, setConfidence] = React.useState<number>(object.confidence ?? 0.7);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveSeq = React.useRef(0);
  const lastSaved = React.useRef({ title: object.title, statement, confidence });

  React.useEffect(() => {
    const nextStatement =
      typeof object.metadata?.statement === "string" ? (object.metadata.statement as string) : "";
    setTitle(object.title ?? "");
    setStatement(nextStatement);
    setConfidence(object.confidence ?? 0.7);
    setSaveState("idle");
    lastSaved.current = { title: object.title, statement: nextStatement, confidence: object.confidence ?? 0.7 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id]);

  const label = confidenceLabel(confidence);

  React.useEffect(() => {
    const next = { title, statement, confidence };
    const prev = lastSaved.current;
    if (next.title === prev.title && next.statement === prev.statement && next.confidence === prev.confidence) {
      return;
    }

    const seq = ++saveSeq.current;
    setSaveState("saving");

    const t = window.setTimeout(async () => {
      try {
        await updateTruthObjectAction({
          id: object.id,
          patch: {
            title,
            confidence: clamp01(confidence),
            metadata: { ...(object.metadata ?? {}), statement },
          },
        });
        if (saveSeq.current !== seq) return;
        lastSaved.current = next;
        setSaveState("saved");
      } catch {
        if (saveSeq.current !== seq) return;
        setSaveState("error");
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [confidence, object.id, object.metadata, statement, title]);

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">Belief</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill className="px-2 py-1 font-mono text-[11px] text-text/80" tone="neutral">
                @{object.handle}
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
              placeholder="Short name for this belief"
              className={cn(
                "mt-2 h-10 w-full rounded-2xl border border-border/20 bg-panel2/35 px-4 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Statement</div>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Write the belief as a clear, testable statement."
              className={cn(
                "mt-2 min-h-[140px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>
        </div>
      </Panel>

      <InsetPanel className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-text/85">Confidence</div>
            <div className="mt-1 text-xs text-muted">How strongly you hold this belief right now.</div>
          </div>
          <Pill tone="accent" className="px-2 py-1 font-mono text-[11px]">
            {label.pct}% {label.label}
          </Pill>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(clamp01(confidence) * 100)}
            onChange={(e) => setConfidence(Number(e.target.value) / 100)}
            className="w-full accent-[rgb(var(--accent))]"
          />
          <div className="mt-2 flex justify-between text-[11px] font-mono text-muted">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </InsetPanel>
    </div>
  );
}

