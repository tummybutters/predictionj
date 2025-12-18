import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Panel, InsetPanel } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { Select } from "@/components/ui/select";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { ensureUser } from "@/services/auth/ensure-user";
import { getPredictionDetailData } from "@/services/predictions";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { PaperPositionControls } from "@/app/predictions/_components/paper-position-controls";
import { PredictionForecastControls } from "@/app/predictions/_components/prediction-forecast-controls";
import { PredictionLineControls } from "@/app/predictions/_components/prediction-line-controls";
import {
  deletePredictionAction,
  resolvePredictionAction,
  updatePredictionAction,
} from "@/app/predictions/actions";

function MetaPill({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "neutral" | "positive" | "danger" }) {
  return (
    <Pill tone={tone ?? "neutral"}>
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value}</span>
    </Pill>
  );
}

export default async function PredictionDetailPage({
  params,
}: {
  params: { prediction_id: string };
}) {
  const ensured = await ensureUser();
  const data = await getPredictionDetailData(ensured.user_id, params.prediction_id);
  if (!data) notFound();

  const { prediction, account, forecasts, positions, ledger } = data;

  const isResolved = Boolean(prediction.resolved_at || prediction.outcome);
  const confidence = Number(prediction.confidence);
  const percent = Number.isFinite(confidence) ? Math.round(confidence * 100) : null;
  const line = Number(prediction.reference_line);
  const linePercent = Number.isFinite(line) ? Math.round(line * 100) : null;
  const edge = Number.isFinite(confidence) && Number.isFinite(line) ? confidence - line : null;
  const openExposure = positions
    .filter((p) => !p.settled_at)
    .reduce((sum, p) => sum + p.stake, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <PageHeader
        title={<span className="text-balance">{prediction.claim}</span>}
        subtitle={
          <span className="text-muted">
            Resolve by <span className="font-mono text-text/80">{prediction.resolution_date}</span>
            {" · "}Status{" "}
            <span className="font-medium text-text/80">{isResolved ? "resolved" : "open"}</span>
          </span>
        }
        actions={
          <>
            <Link href="/predictions">
              <Button variant="secondary" size="sm">
                Back
              </Button>
            </Link>
            <span className="hidden sm:inline-flex">
              <MetaPill
                label="Edge"
                tone={edge !== null && edge >= 0 ? "positive" : "danger"}
                value={
                  edge === null
                    ? "?"
                    : `${edge >= 0 ? "+" : ""}${Math.round(edge * 10_000) / 100}%`
                }
              />
            </span>
          </>
        }
      />

      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <MetaPill label="Forecast" value={`${percent ?? "?"}%`} />
          <MetaPill label="Line" value={`${linePercent ?? "?"}%`} />
          <MetaPill label="Exposure" value={Math.round(openExposure)} />
          <MetaPill label="Balance" value={Math.round(account.balance)} />
          <MetaPill
            label="Edge"
            tone={edge !== null && edge >= 0 ? "positive" : "danger"}
            value={
              edge === null ? "?" : `${edge >= 0 ? "+" : ""}${Math.round(edge * 10_000) / 100}%`
            }
          />
        </div>

        {isResolved ? (
          <div className="mt-4 text-sm">
            Resolution: <span className="font-semibold">{prediction.outcome}</span>
            <span className="text-muted"> · {prediction.resolved_at}</span>
          </div>
        ) : null}

        {prediction.resolution_note ? (
          <InsetPanel className="mt-4 p-4">
            <div className="text-xs font-semibold text-muted">Resolution note</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-text/85">
              {prediction.resolution_note}
            </div>
          </InsetPanel>
        ) : null}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Panel className="p-5">
          <Section
            title="Forecast"
            hint="Track probability updates over time (for calibration + review)."
          >
            {!isResolved ? (
              <InsetPanel className="p-4">
                <PredictionForecastControls
                  predictionId={prediction.id}
                  currentProbability={Number.isFinite(confidence) ? confidence : 0.5}
                />
              </InsetPanel>
            ) : null}

            <InsetPanel className="p-4">
              <div className="text-xs font-semibold text-muted">Recent updates</div>
              {forecasts.length === 0 ? (
                <div className="mt-2 text-sm text-muted">No history yet.</div>
              ) : (
                <ol className="mt-3 space-y-2">
                  {forecasts.slice(0, 8).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border/15 bg-panel/35 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm">
                          <span className="font-mono text-text/85">
                            {Math.round(f.probability * 100)}%
                          </span>
                          {f.note ? (
                            <span className="text-muted"> · {f.note}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(f.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </InsetPanel>
          </Section>
        </Panel>

        <Panel className="p-5">
          <Section
            title="Paper trading"
            hint={
              <>
                Balance <span className="font-mono text-text/80">{Math.round(account.balance)}</span>
                {" · "}At risk{" "}
                <span className="font-mono text-text/80">{Math.round(openExposure)}</span>
              </>
            }
          >
            {!isResolved ? (
              <InsetPanel className="p-4">
                <div className="space-y-4">
                  <PredictionLineControls predictionId={prediction.id} currentLine={line} />
                  <PaperPositionControls
                    predictionId={prediction.id}
                    line={Number.isFinite(line) ? line : 0.5}
                    availableBalance={account.balance}
                  />
                </div>
              </InsetPanel>
            ) : null}

            <InsetPanel className="p-4">
              <div className="text-xs font-semibold text-muted">Positions</div>
              {positions.length === 0 ? (
                <div className="mt-2 text-sm text-muted">No paper positions yet.</div>
              ) : (
                <ol className="mt-3 space-y-2">
                  {positions.slice(0, 10).map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/15 bg-panel/35 px-3 py-2 text-sm"
                    >
                      <div className="text-muted">
                        <span className="font-mono text-text">{p.side.toUpperCase()}</span>{" "}
                        stake{" "}
                        <span className="font-mono text-text">{Math.round(p.stake)}</span> @{" "}
                        <span className="font-mono">{Math.round(p.line * 100)}%</span>
                        <span className="text-xs text-muted">
                          {" "}
                          · {new Date(p.opened_at).toLocaleString()}
                        </span>
                      </div>
                      {p.settled_at && p.pnl !== null ? (
                        <div className={p.pnl >= 0 ? "text-accent" : "text-red-300"}>
                          PnL: {p.pnl >= 0 ? "+" : ""}
                          {Math.round(p.pnl)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted">Open</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </InsetPanel>

            <InsetPanel className="p-4">
              <div className="text-xs font-semibold text-muted">Ledger (recent)</div>
              {ledger.length === 0 ? (
                <div className="mt-2 text-sm text-muted">No ledger activity yet.</div>
              ) : (
                <ol className="mt-3 space-y-2">
                  {ledger.slice(0, 8).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border/15 bg-panel/35 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="text-muted">
                          <span className="font-mono text-text">{l.kind}</span>
                          {l.memo ? <span className="text-muted"> · {l.memo}</span> : null}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(l.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={l.delta >= 0 ? "text-accent" : "text-red-300"}>
                          {l.delta >= 0 ? "+" : ""}
                          {Math.round(l.delta)}
                        </div>
                        <div className="text-xs text-muted">Bal {Math.round(l.balance_after)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </InsetPanel>
          </Section>
        </Panel>
      </div>

      <PredictionForm
        title="Edit (open only)"
        submitLabel="Save"
        action={updatePredictionAction}
        disabled={isResolved}
        defaultValues={{
          id: prediction.id,
          question: prediction.claim,
          confidence: Number(prediction.confidence),
          reference_line: Number(prediction.reference_line),
          resolve_by: prediction.resolution_date,
        }}
      />

      <Panel className="p-5">
        <Section title="Resolve" hint="Resolving makes the prediction immutable.">
          <form action={resolvePredictionAction} className="space-y-4">
            <input type="hidden" name="id" value={prediction.id} />

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                id="outcome"
                name="outcome"
                required
                disabled={isResolved}
                defaultValue=""
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                name="note"
                disabled={isResolved}
                placeholder="Why did it resolve this way?"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted">
                This will settle open paper positions and lock edits.
              </div>
              <Button type="submit" disabled={isResolved}>
                Resolve prediction
              </Button>
            </div>
          </form>
        </Section>
      </Panel>

      <Panel className="p-5">
        <Section
          title="Danger zone"
          hint="Delete is only allowed while open."
          actions={
            <form action={deletePredictionAction}>
              <input type="hidden" name="id" value={prediction.id} />
              <Button variant="destructive" type="submit" disabled={isResolved}>
                Delete prediction
              </Button>
            </form>
          }
        >
          <div className="text-sm text-muted">
            This permanently deletes the contract and associated history.
          </div>
        </Section>
      </Panel>
    </main>
  );
}
