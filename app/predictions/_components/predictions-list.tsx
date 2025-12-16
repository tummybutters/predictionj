"use client";

import Link from "next/link";

import type { PredictionRow } from "@/db/predictions";
import type { PredictionBetRow } from "@/db/prediction_bets";
import { Card, CardContent } from "@/components/ui/card";
import { PredictionBetControls } from "@/app/predictions/_components/prediction-bet-controls";

type Props = {
  predictions: PredictionRow[];
  betsByPredictionId: Record<string, PredictionBetRow | undefined>;
};

function formatPercent(confidence: unknown): number | null {
  const n = typeof confidence === "number" ? confidence : Number(confidence);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function PredictionsList({ predictions, betsByPredictionId }: Props) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-6 text-sm text-muted">
        No open predictions.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {predictions.map((p) => (
        <li key={p.id}>
          <PredictionRowCard prediction={p} bet={betsByPredictionId[p.id]} />
        </li>
      ))}
    </ol>
  );
}

function PredictionRowCard({
  prediction,
  bet,
}: {
  prediction: PredictionRow;
  bet: PredictionBetRow | undefined;
}) {
  const percent = formatPercent(prediction.confidence);
  const confidence = typeof prediction.confidence === "number" ? prediction.confidence : Number(prediction.confidence);

  const hasBet = Boolean(bet);

  return (
    <Card className="transition hover:translate-y-[-1px] hover:border-accent/25 hover:bg-panel/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/predictions/${prediction.id}`} className="block">
              <div className="line-clamp-2 text-sm font-medium hover:underline">
                {prediction.claim}
              </div>
            </Link>
            <div className="mt-1 text-sm text-muted">
              Confidence: {percent ?? "?"}% · Resolve by: {prediction.resolution_date}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-xs text-muted">{prediction.resolution_date}</div>
            {hasBet ? (
              <div className="mt-1 rounded-full border border-accent/25 bg-accent/10 px-2 py-1 text-xs text-accent">
                Bet placed
              </div>
            ) : (
              <div className="mt-1 rounded-full border border-border/25 bg-panel/30 px-2 py-1 text-xs text-muted">
                No bet
              </div>
            )}
          </div>
        </div>

        <PredictionBetControls
          predictionId={prediction.id}
          confidence={Number.isFinite(confidence) ? confidence : 0.5}
          initialStake={bet?.stake ?? null}
        />
      </CardContent>
    </Card>
  );
}
