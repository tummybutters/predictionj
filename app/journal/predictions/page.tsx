import Link from "next/link";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { listByType, type TruthObjectRow } from "@/db/truth_objects";
import { createTruthObjectAction } from "@/app/journal/_actions/truth-objects";
import { PageHeader } from "@/components/app/page-header";
import { PredictionEditor } from "@/components/truth-objects/prediction-editor";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

function formatUpdatedAt(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function readProb(obj: TruthObjectRow): number | null {
  const m = obj.metadata as unknown;
  if (!m || typeof m !== "object") return null;
  const pos = (m as Record<string, unknown>).position;
  if (!pos || typeof pos !== "object") return null;
  const cur = (pos as Record<string, unknown>).current_probability;
  const init = (pos as Record<string, unknown>).initial_probability;
  const n = typeof cur === "number" ? cur : typeof init === "number" ? init : null;
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function formatPercent(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

export default async function JournalPredictionsPage({
  searchParams,
}: {
  searchParams?: { id?: string; prefill?: string; resolve_by?: string };
}) {
  const ensured = await ensureUser();

  let items: TruthObjectRow[] = [];
  let dbReady = true;
  try {
    items = await listByType(ensured.user_id, "prediction", { limit: 120 });
  } catch {
    dbReady = false;
  }

  const prefill = (searchParams?.prefill ?? "").trim();
  const resolveBy = (searchParams?.resolve_by ?? "").trim();

  async function createPrediction() {
    "use server";
    const created = await createTruthObjectAction({
      type: "prediction",
      title: "New prediction",
      body: "",
      handle: "new-prediction",
      metadata: {
        market: { question: "", outcomes: [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }] },
        position: { initial_probability: 0.5, current_probability: 0.5 },
        timing: { close_at: "" },
        resolution: { criteria: "", source_urls: [] },
      },
    });
    redirect(`/journal/predictions?id=${encodeURIComponent(created.id)}`);
  }

  async function createFromPrefill(formData: FormData) {
    "use server";
    const q = `${formData.get("prefill") ?? ""}`.trim();
    const by = `${formData.get("resolve_by") ?? ""}`.trim();
    const created = await createTruthObjectAction({
      type: "prediction",
      title: q ? q.slice(0, 80) : "New prediction",
      body: "",
      handle: q ? q : "new-prediction",
      metadata: {
        market: { question: q, outcomes: [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }] },
        position: { initial_probability: 0.5, current_probability: 0.5 },
        timing: { close_at: by },
        resolution: { criteria: "", source_urls: [] },
      },
    });
    redirect(`/journal/predictions?id=${encodeURIComponent(created.id)}`);
  }

  if (!dbReady) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
        <PageHeader
          title="Predictions"
          subtitle="Apply `db/schema_v2/*` to your Supabase database to enable truth objects."
        />
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Database schema not applied</div>
          <div className="mt-2 text-sm text-muted">
            Run `db/schema_v2/0001_core.sql` then `db/schema_v2/0002_truth_objects.sql`.
          </div>
        </Panel>
      </main>
    );
  }

  const selectedId = searchParams?.id?.trim() || items[0]?.id || "";
  const selected = items.find((b) => b.id === selectedId) ?? items[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Predictions"
        subtitle="Personal, trackable predictions modeled like lightweight markets."
        actions={
          <form action={createPrediction}>
            <Button variant="secondary" size="sm" type="submit">
              New Prediction
            </Button>
          </form>
        }
      />

      {prefill ? (
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text/90">Create from market</div>
              <div className="mt-1 text-sm text-muted">
                Prefilled from: <span className="text-text/80">{prefill}</span>
                {resolveBy ? (
                  <>
                    {" "}
                    • Resolve by <span className="font-mono text-text/70">{resolveBy}</span>
                  </>
                ) : null}
              </div>
            </div>
            <form action={createFromPrefill}>
              <input type="hidden" name="prefill" value={prefill} />
              <input type="hidden" name="resolve_by" value={resolveBy} />
              <Button type="submit">Create</Button>
            </form>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel className="p-3">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">
              Predictions
            </div>
            <Pill className="px-2 py-1 font-mono text-[11px]">{items.length}</Pill>
          </div>

          <div className="space-y-2">
            {items.map((b) => {
              const title = (b.title ?? "").trim() || "Untitled";
              const active = selected?.id === b.id;
              const p = readProb(b);
              return (
                <Link
                  key={b.id}
                  href={`/journal/predictions?id=${encodeURIComponent(b.id)}`}
                  className={cn(
                    "block rounded-2xl border px-4 py-3 transition-colors",
                    active
                      ? "border-accent/35 bg-accent/10"
                      : "border-border/15 bg-panel/35 hover:bg-panel/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-semibold text-text/85">
                        {title}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Pill className="px-2 py-1 text-[11px]" tone="accent">
                          {formatPercent(p)}
                        </Pill>
                        <span className="text-[11px] text-muted">
                          Updated {formatUpdatedAt(b.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        active ? "bg-accent" : "bg-border/40",
                      )}
                    />
                  </div>
                </Link>
              );
            })}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-border/15 bg-panel/35 p-4 text-sm text-muted">
                No predictions yet. Create one from the button above or from a market page.
              </div>
            ) : null}
          </div>
        </Panel>

        {selected ? <PredictionEditor object={selected} /> : <Panel className="p-6">—</Panel>}
      </div>
    </main>
  );
}
