import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { listByType, type TruthObjectRow } from "@/db/truth_objects";
import { createTruthObjectAction } from "@/app/journal/_actions/truth-objects";
import { PageHeader } from "@/components/app/page-header";
import { BeliefEditor } from "@/components/truth-objects/belief-editor";
import { Panel } from "@/components/ui/panel";

import { JournalShell } from "@/app/journal/_components/journal-shell";

export default async function JournalBeliefsPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const ensured = await ensureUser();

  let beliefs: TruthObjectRow[] = [];
  let dbReady = true;
  try {
    beliefs = await listByType(ensured.user_id, "belief", { limit: 120 });
  } catch {
    dbReady = false;
  }

  async function createBelief() {
    "use server";
    const created = await createTruthObjectAction({
      type: "belief",
      title: "",
      confidence: 0.7,
      metadata: { statement: "" },
      handle: "belief",
    });
    redirect(`/journal/beliefs?id=${encodeURIComponent(created.id)}`);
  }

  if (!dbReady) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
        <PageHeader
          title="Beliefs"
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

  const selectedId = searchParams?.id?.trim() || beliefs[0]?.id || "";
  const selected = beliefs.find((b) => b.id === selectedId) ?? beliefs[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <JournalShell
        title="Beliefs"
        subtitle="Declare your world model and track your certainty over time."
        initialEntries={beliefs}
        mentionables={beliefs}
        selectedId={selectedId}
        hrefBase="/journal/beliefs?id="
        newAction={createBelief}
      >
        {selected ? <BeliefEditor object={selected} /> : <Panel className="p-6">—</Panel>}
      </JournalShell>
    </main>
  );
}
