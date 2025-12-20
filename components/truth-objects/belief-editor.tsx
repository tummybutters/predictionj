"use client";

import * as React from "react";

import type { TruthObjectRow } from "@/db/truth_objects";
import { cn } from "@/lib/cn";
import { isDefaultHandle, normalizeHandle } from "@/lib/handles";
import { Pill } from "@/components/ui/pill";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { suggestHandleAction, updateTruthObjectAction } from "@/app/journal/_actions/truth-objects";

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
  const [handle, setHandle] = React.useState(object.handle ?? "");
  const [handleState, setHandleState] = React.useState<"idle" | "loading" | "error">("idle");
  const [editingHandle, setEditingHandle] = React.useState(false);
  const [handleDraft, setHandleDraft] = React.useState(object.handle ?? "");
  const [handleError, setHandleError] = React.useState<string | null>(null);
  const autoHandleRef = React.useRef(false);

  const saveSeq = React.useRef(0);
  const lastSaved = React.useRef({ title: object.title, statement, confidence });

  React.useEffect(() => {
    const nextStatement =
      typeof object.metadata?.statement === "string" ? (object.metadata.statement as string) : "";
    setTitle(object.title ?? "");
    setStatement(nextStatement);
    setConfidence(object.confidence ?? 0.7);
    setSaveState("idle");
    setHandle(object.handle ?? "");
    setHandleState("idle");
    setEditingHandle(false);
    setHandleDraft(object.handle ?? "");
    setHandleError(null);
    autoHandleRef.current = false;
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

  React.useEffect(() => {
    if (autoHandleRef.current) return;
    if (!isDefaultHandle(handle)) return;
    const seed = (statement || title).trim();
    if (seed.length < 3) return;

    const t = window.setTimeout(async () => {
      autoHandleRef.current = true;
      setHandleState("loading");
      try {
        const res = await suggestHandleAction({ id: object.id, seed });
        setHandle(res.handle);
        setHandleDraft(res.handle);
        setHandleState("idle");
      } catch {
        setHandleState("error");
        window.setTimeout(() => setHandleState("idle"), 1200);
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [handle, object.id, statement, title]);

  async function regenerateHandle() {
    autoHandleRef.current = true;
    setHandleState("loading");
    try {
      const seed = (statement || title).trim();
      const res = await suggestHandleAction({ id: object.id, seed });
      setHandle(res.handle);
      setHandleDraft(res.handle);
      setHandleState("idle");
    } catch {
      setHandleState("error");
      window.setTimeout(() => setHandleState("idle"), 1400);
    }
  }

  async function saveHandle() {
    const next = normalizeHandle(handleDraft);
    if (!next) return;
    setHandleState("loading");
    setHandleError(null);
    try {
      await updateTruthObjectAction({ id: object.id, patch: { handle: next } });
      setHandle(next);
      setEditingHandle(false);
      setHandleState("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Handle update failed";
      setHandleError(message);
      setHandleState("error");
      window.setTimeout(() => setHandleState("idle"), 1400);
    }
  }

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">Belief</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill className="px-2 py-1 font-mono text-[11px] text-text/80" tone="neutral">
              @{handle}
            </Pill>
            <button
              type="button"
              onClick={regenerateHandle}
              disabled={handleState === "loading"}
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-plush transition",
                handleState === "loading"
                  ? "border-border/15 bg-panel/40 text-muted"
                  : "border-border/20 bg-panel/55 text-text/70 hover:bg-panel/70",
              )}
              aria-live="polite"
            >
              {handleState === "loading" ? "Naming…" : handleState === "error" ? "Try again" : "AI"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingHandle((v) => !v);
                setHandleDraft(handle);
                setHandleError(null);
              }}
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-plush transition",
                "border-border/20 bg-panel/55 text-text/70 hover:bg-panel/70",
              )}
            >
              Edit
            </button>
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

      {editingHandle ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={handleDraft}
            onChange={(e) => setHandleDraft(e.target.value)}
            className={cn(
              "h-9 w-56 rounded-xl border border-border/20 bg-panel2/35 px-3 text-xs font-mono text-text/85 outline-none shadow-plush",
              "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
            )}
            placeholder="short-handle"
          />
          <button
            type="button"
            onClick={saveHandle}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-plush hover:brightness-105"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingHandle(false);
              setHandleDraft(handle);
              setHandleError(null);
            }}
            className="rounded-xl border border-border/20 bg-panel/55 px-3 py-2 text-xs font-semibold text-text/70 hover:bg-panel/70"
          >
            Cancel
          </button>
          {handleError ? <span className="text-xs text-rose-300">{handleError}</span> : null}
        </div>
      ) : null}

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
