"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { openPaperPosition } from "@/app/predictions/actions";

function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function computeEstimates(params: {
  stake: number;
  line: number;
  side: "yes" | "no";
}): { winPayout: number; winPnl: number; losePnl: number } | null {
  const { stake, line, side } = params;
  if (!Number.isFinite(stake) || stake <= 0) return null;
  if (!Number.isFinite(line) || line <= 0 || line >= 1) return null;

  const price = side === "yes" ? line : 1 - line;
  if (price <= 0) return null;

  const winPayout = stake / price;
  const winPnl = winPayout - stake;
  const losePnl = -stake;
  return { winPayout, winPnl, losePnl };
}

export function PaperPositionControls({
  predictionId,
  line,
  availableBalance,
  className,
}: {
  predictionId: string;
  line: number;
  availableBalance: number;
  className?: string;
}) {
  const router = useRouter();
  const [stake, setStake] = React.useState("");
  const [side, setSide] = React.useState<"yes" | "no">("yes");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const stakeInput = stake.trim().replace(/,/g, "");
  const s = Number(stakeInput);
  const stakeNumber = Number.isFinite(s) ? s : 0;
  const canSubmit =
    !isPending && stakeInput.length > 0 && Number.isFinite(s) && s > 0 && s <= availableBalance;

  const est = computeEstimates({ stake: stakeNumber, line, side });

  return (
    <div className={cn("grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end", className)}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted">Trade ticket</div>
          <div className="text-xs text-muted">
            Line: <span className="font-mono text-text">{formatPercent(line)}</span> ·
            Avail: <span className="font-mono text-text">{Math.floor(availableBalance)}</span>
          </div>
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted" htmlFor={`side_${predictionId}`}>
              Side
            </label>
            <Select
              id={`side_${predictionId}`}
              value={side}
              disabled={isPending}
              onChange={(e) => {
                setError(null);
                setSide(e.target.value === "no" ? "no" : "yes");
              }}
            >
              <option value="yes">YES</option>
              <option value="no">NO</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted" htmlFor={`stake_${predictionId}`}>
              Stake
            </label>
            <Input
              id={`stake_${predictionId}`}
              inputMode="decimal"
              value={stake}
              onChange={(e) => {
                setError(null);
                setStake(e.target.value);
              }}
              placeholder="e.g. 50"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="mt-2 text-xs text-muted">
          {est ? (
            <>
              Win:{" "}
              <span className={est.winPnl >= 0 ? "text-accent" : "text-red-300"}>
                {est.winPnl >= 0 ? "+" : ""}
                {Math.round(est.winPnl)}
              </span>
              {" · "}Lose:{" "}
              <span className="text-red-300">{Math.round(est.losePnl)}</span>
              {" · "}Win payout: <span className="font-mono">{Math.round(est.winPayout)}</span>
            </>
          ) : (
            "Uses fixed odds versus the reference line; max loss is your stake."
          )}
        </div>

        {error ? (
          <div className="mt-2 rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await openPaperPosition({ prediction_id: predictionId, side, stake: stakeInput });
                setStake("");
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to open position.");
              }
            })
          }
        >
          Open position
        </Button>
      </div>
    </div>
  );
}
