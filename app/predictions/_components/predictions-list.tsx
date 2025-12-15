import Link from "next/link";

import type { PredictionRow } from "@/db/predictions";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  predictions: PredictionRow[];
};

export function PredictionsList({ predictions }: Props) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-6 text-sm text-muted">
        No open predictions.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {predictions.map((p) => {
        const confidence = Number(p.confidence);
        const percent = Number.isFinite(confidence)
          ? Math.round(confidence * 100)
          : null;

        return (
          <li key={p.id}>
            <Link href={`/predictions/${p.id}`} className="block">
              <Card className="transition hover:translate-y-[-1px] hover:border-accent/25 hover:bg-panel/70">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-medium">
                        {p.claim}
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        Confidence: {percent ?? "?"}%
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-xs text-muted">
                      {p.resolution_date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
