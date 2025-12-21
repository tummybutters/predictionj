"use client";

import * as React from "react";

import type { TruthObjectRow } from "@/db/truth_objects";
import { cn } from "@/lib/cn";
import { normalizeShortHandle } from "@/lib/handles";
import { Pill } from "@/components/ui/pill";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { suggestHandleAction, updateTruthObjectAction } from "@/app/journal/_actions/truth-objects";
import { deriveTitle } from "@/lib/journal";

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
  // --- Local State ---
  const [title, setTitle] = React.useState(object.title ?? "");
  const [statement, setStatement] = React.useState(
    typeof object.metadata?.statement === "string" ? (object.metadata.statement as string) : "",
  );
  const [confidence, setConfidence] = React.useState<number>(object.confidence ?? 0.7);
  const [handle, setHandle] = React.useState(object.handle ?? "");

  // --- UI/UX State ---
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error" | "dirty">("idle");
  const [handleState, setHandleState] = React.useState<"idle" | "loading" | "error">("idle");
  const [editingHandle, setEditingHandle] = React.useState(false);
  const [handleDraft, setHandleDraft] = React.useState(object.handle ?? "");
  const [handleError, setHandleError] = React.useState<string | null>(null);

  // --- Refs for logic ---
  const saveSeq = React.useRef(0);
  const lastSavedRef = React.useRef({ title: object.title ?? "", statement, confidence });
  const isFirstMount = React.useRef(true);

  const activeIdRef = React.useRef(object.id);

  // Reset state when object changes
  React.useEffect(() => {
    if (object.id !== activeIdRef.current) {
      const nextStatement =
        typeof object.metadata?.statement === "string" ? (object.metadata.statement as string) : "";
      activeIdRef.current = object.id;
      setTitle(object.title ?? "");
      setStatement(nextStatement);
      setConfidence(object.confidence ?? 0.7);
      setHandle(object.handle ?? "");
      setHandleDraft(object.handle ?? "");
      setSaveState("idle");
      setEditingHandle(false);
      setHandleError(null);
      lastSavedRef.current = {
        title: object.title ?? "",
        statement: nextStatement,
        confidence: object.confidence ?? 0.7,
      };
      isFirstMount.current = true;
    }
  }, [object.id, object.title, object.confidence, object.metadata, object.handle]);

  // Check for dirty state
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const current = { title, statement, confidence };
    const last = lastSavedRef.current;

    const isDirty =
      current.title !== last.title ||
      current.statement !== last.statement ||
      current.confidence !== last.confidence;

    if (isDirty) {
      setSaveState("dirty");
    } else if (saveState === "dirty") {
      setSaveState("idle");
    }
  }, [title, statement, confidence, saveState]);

  // Handle auto-save
  React.useEffect(() => {
    if (saveState !== "dirty") return;

    const seq = ++saveSeq.current;
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const patch = {
          title,
          confidence: clamp01(confidence),
          metadata: { ...(object.metadata ?? {}), statement },
        };
        await updateTruthObjectAction({ id: object.id, patch });

        if (saveSeq.current !== seq) return;

        lastSavedRef.current = { title, statement, confidence };
        setSaveState("saved");

        // Return to idle after a brief "saved" flash
        window.setTimeout(() => {
          if (saveSeq.current === seq) setSaveState("idle");
        }, 2000);
      } catch (err) {
        if (saveSeq.current !== seq) return;
        console.error("Auto-save failed:", err);
        setSaveState("error");
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [saveState, title, statement, confidence, object.id, object.metadata]);

  // Handle generation logic (AI Naming)
  async function regenerateHandle() {
    setHandleState("loading");
    try {
      const seed = (statement || title || "belief").trim();
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
    const next = normalizeShortHandle(handleDraft, 7);
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

  const label = confidenceLabel(confidence);
  const inferredTitle = title.trim() ? null : deriveTitle(statement);

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/10 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted/60">Belief Object</span>
              <Pill tone="neutral" className="px-2 py-0.5 font-mono text-[10px]">@{handle}</Pill>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={regenerateHandle}
                disabled={handleState === "loading"}
                className={cn(
                  "rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-tight shadow-sm transition",
                  handleState === "loading"
                    ? "border-border/15 bg-panel/40 text-muted"
                    : "border-border/20 bg-panel/55 text-text/70 hover:bg-panel/70",
                )}
              >
                {handleState === "loading" ? "Naming…" : "AI Suggest"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingHandle((v) => !v);
                  setHandleDraft(handle);
                  setHandleError(null);
                }}
                className="rounded-lg border border-border/20 bg-panel/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-tight text-text/70 shadow-sm hover:bg-panel/70"
              >
                {editingHandle ? "Cancel" : "Edit Handle"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Pill
              tone={
                saveState === "error" ? "danger" :
                  saveState === "saved" ? "positive" :
                    saveState === "saving" ? "accent" :
                      saveState === "dirty" ? "neutral" : "neutral"
              }
              className={cn(
                "px-2 py-1 font-mono text-[11px] transition-opacity duration-300",
                saveState === "idle" && "opacity-40"
              )}
            >
              {saveState === "saving" ? "Saving…" :
                saveState === "saved" ? "Saved" :
                  saveState === "error" ? "Error" :
                    saveState === "dirty" ? "Unsaved Changes" : "Synced"}
            </Pill>
          </div>
        </div>

        {editingHandle && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-panel/30 p-3">
            <input
              value={handleDraft}
              onChange={(e) => setHandleDraft(e.target.value)}
              className="h-8 w-48 rounded-lg border border-border/20 bg-panel2/40 px-3 font-mono text-xs text-text outline-none focus:border-accent/40"
              placeholder="short-handle"
              autoFocus
            />
            <button
              type="button"
              onClick={saveHandle}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
            >
              Save
            </button>
            {handleError && <span className="text-[10px] text-rose-400">{handleError}</span>}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="group relative">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted/70">Title</label>
              {inferredTitle && (
                <span className="text-[10px] text-muted/50 italic">Auto-deriving from statement</span>
              )}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={inferredTitle || "Descriptive name"}
              className={cn(
                "mt-2 w-full bg-transparent text-xl font-bold text-text outline-none placeholder:text-muted/30",
                !title && "text-text/50"
              )}
            />
          </div>

          <div className="relative">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted/70">Statement</label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="What do you believe to be true? Make it testable."
              className="mt-2 min-h-[160px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-text/90 outline-none placeholder:text-muted/30"
            />
          </div>
        </div>
      </Panel>

      <InsetPanel className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-text/90">Confidence</div>
            <div className="mt-0.5 text-xs text-muted">Current level of certainty</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-accent">{label.pct}%</span>
            <Pill tone="accent" className="px-2 py-0.5 text-[10px] uppercase tracking-widest">{label.label}</Pill>
          </div>
        </div>

        <div className="mt-6">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(clamp01(confidence) * 100)}
            onChange={(e) => setConfidence(Number(e.target.value) / 100)}
            className="w-full cursor-pointer accent-accent"
          />
          <div className="mt-3 flex justify-between px-1 text-[10px] font-bold uppercase tracking-tighter text-muted/40">
            <span>Doubt</span>
            <span>Uncertain</span>
            <span>Certainty</span>
          </div>
        </div>
      </InsetPanel>
    </div>
  );
}
