import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { listByType, type TruthObjectRow } from "@/db/truth_objects";
import { createTruthObjectAction } from "@/app/journal/_actions/truth-objects";
import { PageHeader } from "@/components/app/page-header";
import { PredictionEditor } from "@/components/truth-objects/prediction-editor";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

import { JournalShell } from "@/app/journal/_components/journal-shell";

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
      title: "",
      body: "",
      handle: "prediction",
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
      title: q ? q.slice(0, 80) : "",
      body: "",
      handle: q ? q : "prediction",
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
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <JournalShell
        title="Predictions"
        subtitle="Personal, trackable predictions modeled like lightweight markets."
        initialEntries={items}
        mentionables={items}
        selectedId={selectedId}
        hrefBase="/journal/predictions?id="
        newAction={createPrediction}
      >
        <div className="space-y-6">
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

          {selected ? <PredictionEditor object={selected} /> : <Panel className="p-6">—</Panel>}
        </div>
      </JournalShell>
    </main>
  );
}
