"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { deletePredictionBet, upsertPredictionBet } from "@/app/predictions/actions";

function scoreDelta(stake: number, p: number, y: 0 | 1): number {
  const delta = stake * (1 - 4 * (p - y) * (p - y));
  return Math.round(delta * 100) / 100;
}

export function PredictionBetControls({
  predictionId,
  confidence,
  initialStake,
  className,
}: {
  predictionId: string;
  confidence: number;
  initialStake?: number | null;
  className?: string;
}) {
  const router = useRouter();
  const [stake, setStake] = React.useState(() =>
    initialStake !== undefined && initialStake !== null
      ? String(Math.round(initialStake))
      : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setStake(
      initialStake !== undefined && initialStake !== null
        ? String(Math.round(initialStake))
        : "",
    );
  }, [initialStake]);

  const stakeInput = stake.trim().replace(/,/g, "");
  const s = Number(stakeInput);
  const stakeNumber = Number.isFinite(s) ? s : 0;
  const p = confidence;

  const deltaTrue =
    Number.isFinite(p) && stakeNumber > 0 ? scoreDelta(stakeNumber, p, 1) : null;
  const deltaFalse =
    Number.isFinite(p) && stakeNumber > 0 ? scoreDelta(stakeNumber, p, 0) : null;
  const ev =
    Number.isFinite(p) && stakeNumber > 0
      ? stakeNumber * (2 * p - 1) * (2 * p - 1)
      : null;

  const hasBet = Boolean(initialStake && initialStake > 0);
  const canSubmit = !isPending && stakeInput.length > 0 && Number.isFinite(s) && s > 0;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end", className)}>
      <div>
        <label className="text-xs text-muted" htmlFor={`stake_${predictionId}`}>
          Stake (credits)
        </label>
        <input
          id={`stake_${predictionId}`}
          inputMode="decimal"
          value={stake}
          onChange={(e) => {
            setError(null);
            setStake(e.target.value);
          }}
          placeholder="e.g. 50"
          className="mt-1 flex h-10 w-full rounded-xl border border-border/25 bg-panel/55 px-3 py-2 text-sm text-text shadow-plush placeholder:text-muted/80 transition-[box-shadow,border-color,background-color] duration-350 ease-spring motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
        />
        <div className="mt-1 text-xs text-muted">
          {deltaTrue !== null && deltaFalse !== null ? (
            <>
              If true:{" "}
              <span className={deltaTrue >= 0 ? "text-accent" : "text-red-300"}>
                {deltaTrue >= 0 ? "+" : ""}
                {Math.round(deltaTrue)}
              </span>
              {" · "}If false:{" "}
              <span className={deltaFalse >= 0 ? "text-accent" : "text-red-300"}>
                {deltaFalse >= 0 ? "+" : ""}
                {Math.round(deltaFalse)}
              </span>
              {ev !== null ? (
                <>
                  {" · "}EV: <span className="font-mono">{Math.round(ev)}</span>
                </>
              ) : null}
            </>
          ) : (
            "Uses your confidence as the scoring price."
          )}
        </div>
        {error ? (
          <div className="mt-2 rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        {hasBet ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deletePredictionBet({ prediction_id: predictionId });
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to remove bet.");
                }
              })
            }
          >
            Remove
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await upsertPredictionBet({ prediction_id: predictionId, stake });
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save bet.");
              }
            })
          }
        >
          {hasBet ? "Update bet" : "Place bet"}
        </Button>
      </div>
    </div>
  );
}
