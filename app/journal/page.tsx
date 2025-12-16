import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { list } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import { createBlankJournalEntryAction } from "@/app/journal/actions";
import { Button } from "@/components/ui/button";

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
    <section className="glass-panel rounded-2xl p-6">
      {searchParams?.error === "validation" ? (
        <div className="rounded-xl border border-accent/30 bg-panel/60 p-3 text-sm text-accent">
          Invalid input. Please try again.
        </div>
      ) : null}
      <div className="text-sm font-medium">No entries yet</div>
      <div className="mt-1 text-sm text-muted">Create your first entry to start building a library.</div>
      <form action={createBlankJournalEntryAction} className="mt-4">
        <Button type="submit">Create first entry</Button>
      </form>
    </section>
  );
}
