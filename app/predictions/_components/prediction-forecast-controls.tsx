"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { updatePredictionForecast } from "@/app/predictions/actions";

function normalizePercentInput(raw: string): string {
  return raw.trim().replace(/%$/, "").replace(/,/g, "");
}

export function PredictionForecastControls({
  predictionId,
  currentProbability,
  className,
}: {
  predictionId: string;
  currentProbability: number;
  className?: string;
}) {
  const router = useRouter();
  const [probability, setProbability] = React.useState(() =>
    Number.isFinite(currentProbability) ? String(Math.round(currentProbability * 100)) : "",
  );
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setProbability(
      Number.isFinite(currentProbability) ? String(Math.round(currentProbability * 100)) : "",
    );
  }, [currentProbability]);

  const probabilityInput = normalizePercentInput(probability);
  const canSubmit = !isPending && probabilityInput.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted" htmlFor={`p_${predictionId}`}>
            Forecast (%)
          </label>
          <Input
            id={`p_${predictionId}`}
            inputMode="decimal"
            value={probability}
            onChange={(e) => {
              setError(null);
              setProbability(e.target.value);
            }}
            placeholder="e.g. 65"
            disabled={isPending}
          />
          <div className="text-xs text-muted">Logs an update to your forecast history.</div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted" htmlFor={`note_${predictionId}`}>
            Reason (optional)
          </label>
          <Input
            id={`note_${predictionId}`}
            value={note}
            onChange={(e) => {
              setError(null);
              setNote(e.target.value);
            }}
            placeholder="What changed?"
            disabled={isPending}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await updatePredictionForecast({
                prediction_id: predictionId,
                probability: probabilityInput,
                note,
              });

              if (!result.success) {
                setError(result.message || "Failed to update forecast.");
                return;
              }

              setNote("");
              router.refresh();
            })
          }
        >
          Log update
        </Button>
      </div>
    </div>
  );
}
