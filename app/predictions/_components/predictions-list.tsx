import Link from "next/link";

import type { PredictionRow } from "@/db/predictions";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";

type PositionSummary = {
  yes_stake: number;
  no_stake: number;
  total_stake: number;
};

type Props = {
  predictions: PredictionRow[];
  positionsByPredictionId: Record<string, PositionSummary | undefined>;
};

function percent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "?";
  if (!Number.isFinite(n)) return "?";
  return String(Math.round(n * 100));
}

function formatEdge(forecast: number, line: number): number | null {
  if (!Number.isFinite(forecast) || !Number.isFinite(line)) return null;
  return Math.round((forecast - line) * 10_000) / 100;
}

function formatPosition(summary: PositionSummary | undefined): string {
  if (!summary || summary.total_stake <= 0) return "—";
  const parts: string[] = [];
  if (summary.yes_stake > 0) parts.push(`Y ${Math.round(summary.yes_stake)}`);
  if (summary.no_stake > 0) parts.push(`N ${Math.round(summary.no_stake)}`);
  return parts.join(" · ");
}

export function PredictionsList({ predictions, positionsByPredictionId }: Props) {
  if (predictions.length === 0) {
    return <EmptyState>No open predictions.</EmptyState>;
  }

  return (
    <Panel className="p-0">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/15 px-4 py-3 text-xs text-muted sm:grid-cols-[1fr_90px_70px_70px_70px_110px]">
          <div>Contract</div>
          <div className="hidden sm:block">Resolve</div>
          <div className="hidden sm:block text-right">My %</div>
          <div className="hidden sm:block text-right">Line</div>
          <div className="hidden sm:block text-right">Edge</div>
          <div className="hidden sm:block text-right">Pos</div>
          <div className="text-right sm:hidden">My</div>
        </div>
        <ol className="divide-y divide-border/10">
          {predictions.map((p) => {
            const pos = positionsByPredictionId[p.id];
            const edge = formatEdge(p.confidence, p.reference_line);
            const edgeText = edge === null ? "?" : `${edge >= 0 ? "+" : ""}${edge}%`;

            return (
              <li key={p.id} className="px-4 py-3 transition-colors duration-200 ease-out hover:bg-panel/40">
                <div className="grid grid-cols-[1fr_auto] items-start gap-3 sm:grid-cols-[1fr_90px_70px_70px_70px_110px]">
                  <div className="min-w-0">
                    <Link href={`/predictions/${p.id}`} className="block">
                      <div className="line-clamp-2 text-sm font-medium hover:underline">
                        {p.claim}
                      </div>
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted sm:hidden">
                      <span className="font-mono">Resolve {p.resolution_date}</span>
                      <span className="font-mono">
                        My {percent(p.confidence)}% · Line {percent(p.reference_line)}%
                      </span>
                      <span className="font-mono">Edge {edgeText}</span>
                      <span className="font-mono">Pos {formatPosition(pos)}</span>
                    </div>
                  </div>

                  <div className="hidden font-mono text-xs text-muted sm:block">
                    {p.resolution_date}
                  </div>
                  <div className="hidden text-right font-mono text-xs sm:block">
                    {percent(p.confidence)}%
                  </div>
                  <div className="hidden text-right font-mono text-xs text-muted sm:block">
                    {percent(p.reference_line)}%
                  </div>
                  <div
                    className={[
                      "hidden text-right font-mono text-xs sm:block",
                      edge !== null && edge >= 0 ? "text-accent" : "text-red-300",
                    ].join(" ")}
                  >
                    {edgeText}
                  </div>
                  <div className="hidden text-right font-mono text-xs text-muted sm:block">
                    {formatPosition(pos)}
                  </div>

                  <div className="sm:hidden text-right font-mono text-xs text-muted">
                    {percent(p.confidence)}%
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
    </Panel>
  );
}
