"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { updatePredictionLine } from "@/app/predictions/actions";

function normalizePercentInput(raw: string): string {
  return raw.trim().replace(/%$/, "").replace(/,/g, "");
}

export function PredictionLineControls({
  predictionId,
  currentLine,
  className,
}: {
  predictionId: string;
  currentLine: number;
  className?: string;
}) {
  const router = useRouter();
  const [line, setLine] = React.useState(() =>
    Number.isFinite(currentLine) ? String(Math.round(currentLine * 100)) : "50",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setLine(Number.isFinite(currentLine) ? String(Math.round(currentLine * 100)) : "50");
  }, [currentLine]);

  const lineInput = normalizePercentInput(line);
  const canSubmit = !isPending && lineInput.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grow space-y-1">
          <label className="text-xs text-muted" htmlFor={`line_${predictionId}`}>
            Line (reference %)
          </label>
          <Input
            id={`line_${predictionId}`}
            inputMode="decimal"
            value={line}
            onChange={(e) => {
              setError(null);
              setLine(e.target.value);
            }}
            placeholder="e.g. 50"
            disabled={isPending}
          />
          <div className="text-xs text-muted">
            A static “market snapshot” to measure edge against. Not dynamically priced.
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await updatePredictionLine({
                prediction_id: predictionId,
                reference_line: lineInput,
              });

              if (!result.success) {
                setError(result.message || "Failed to update line.");
                return;
              }

              router.refresh();
            })
          }
        >
          Update line
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
