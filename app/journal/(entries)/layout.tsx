import { ensureUser } from "@/services/auth/ensure-user";
import { listByType, listRecent, type TruthObjectRow } from "@/db/truth_objects";
import { JournalShell } from "@/app/journal/_components/journal-shell";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";

export default async function JournalEntriesLayout({ children }: { children: React.ReactNode }) {
  const ensured = await ensureUser();
  let notes: TruthObjectRow[] = [];
  let mentionables: TruthObjectRow[] = [];
  let dbReady = true;
  try {
    [notes, mentionables] = await Promise.all([
      listByType(ensured.user_id, "note", { limit: 220 }),
      listRecent(ensured.user_id, { limit: 400 }),
    ]);
  } catch {
    dbReady = false;
  }

  if (!dbReady) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
        <PageHeader
          title="Journal"
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

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-10 pt-24">
      <JournalShell initialEntries={notes} mentionables={mentionables}>
        {children}
      </JournalShell>
    </main>
  );
}
