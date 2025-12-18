import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { listEntries } from "@/services/journal";
import { createBlankJournalEntryAction } from "@/app/journal/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default async function JournalIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const ensured = await ensureUser();
  const entries = await listEntries(ensured.user_id, { limit: 1 });

  const latest = entries[0];
  if (latest) redirect(`/journal/${latest.id}`);

  return (
    <Panel className="p-6">
      {searchParams?.error === "validation" ? (
        <div className="rounded-2xl border border-accent/20 bg-panel/55 p-3 text-sm text-accent">
          Invalid input. Please try again.
        </div>
      ) : null}
      <div className="text-sm font-medium">No entries yet</div>
      <div className="mt-1 text-sm text-muted">Create your first entry to start building a library.</div>
      <form action={createBlankJournalEntryAction} className="mt-4">
        <Button type="submit">Create first entry</Button>
      </form>
    </Panel>
  );
}
