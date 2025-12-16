import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { list } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import { createBlankJournalEntryAction } from "@/app/journal/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

export default async function JournalIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const entries = await list(ensured.user_id, { limit: 1 });

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
