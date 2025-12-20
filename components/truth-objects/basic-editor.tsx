"use client";

import * as React from "react";

import type { TruthObjectRow, TruthObjectType } from "@/db/truth_objects";
import { cn } from "@/lib/cn";
import { Pill } from "@/components/ui/pill";
import { Panel } from "@/components/ui/panel";
import { updateTruthObjectAction } from "@/app/journal/_actions/truth-objects";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function BasicTruthObjectEditor({
  object,
  showSourceUrl = true,
  showConfidence = false,
}: {
  object: TruthObjectRow;
  showSourceUrl?: boolean;
  showConfidence?: boolean;
}) {
  const [title, setTitle] = React.useState(object.title ?? "");
  const [body, setBody] = React.useState(object.body ?? "");
  const [sourceUrl, setSourceUrl] = React.useState(object.source_url ?? "");
  const [confidence, setConfidence] = React.useState<number>(object.confidence ?? 0.7);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveSeq = React.useRef(0);
  const lastSaved = React.useRef({ title: object.title, body: object.body, sourceUrl: object.source_url, confidence: object.confidence });

  React.useEffect(() => {
    setTitle(object.title ?? "");
    setBody(object.body ?? "");
    setSourceUrl(object.source_url ?? "");
    setConfidence(object.confidence ?? 0.7);
    setSaveState("idle");
    lastSaved.current = { title: object.title, body: object.body, sourceUrl: object.source_url, confidence: object.confidence };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id]);

  React.useEffect(() => {
    const next = { title, body, sourceUrl, confidence };
    const prev = lastSaved.current;
    if (
      next.title === prev.title &&
      next.body === prev.body &&
      next.sourceUrl === prev.sourceUrl &&
      next.confidence === prev.confidence
    ) {
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
            body,
            ...(showSourceUrl ? { source_url: sourceUrl || null } : {}),
            ...(showConfidence ? { confidence: clamp01(confidence) } : {}),
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
  }, [body, confidence, object.id, showConfidence, showSourceUrl, sourceUrl, title]);

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted">{object.type}</div>
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
            placeholder="Short name"
            className={cn(
              "mt-2 h-10 w-full rounded-2xl border border-border/20 bg-panel2/35 px-4 text-sm text-text/85 outline-none shadow-inset",
              "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
            )}
          />
        </div>

        {showSourceUrl ? (
          <div>
            <div className="text-xs font-semibold text-muted">Source URL</div>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className={cn(
                "mt-2 h-10 w-full rounded-2xl border border-border/20 bg-panel2/35 px-4 text-sm text-text/85 outline-none shadow-inset",
                "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
              )}
            />
          </div>
        ) : null}

        <div>
          <div className="text-xs font-semibold text-muted">Body</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste anything. Write freely."
            className={cn(
              "mt-2 min-h-[320px] w-full resize-none rounded-2xl border border-border/20 bg-panel2/35 px-4 py-3 text-sm text-text/85 outline-none shadow-inset",
              "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/15",
            )}
          />
        </div>
      </div>
    </Panel>
  );
}

export function defaultTitleForType(type: TruthObjectType): string {
  if (type === "framework") return "New framework";
  if (type === "data") return "New data";
  if (type === "note") return "New note";
  if (type === "prediction") return "New prediction";
  return "New belief";
}

