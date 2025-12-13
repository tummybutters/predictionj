import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { list } from "@/db/journal_entries";
import { Button } from "@/components/ui/button";
import { createJournalEntryAction } from "@/app/journal/actions";
import { ensureUser } from "@/services/auth/ensure-user";
import { JournalEntriesList } from "@/app/journal/_components/journal-entries-list";
import { JournalEntryForm } from "@/app/journal/_components/journal-entry-form";

export const dynamic = "force-dynamic";

export default async function JournalIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const entries = await list(ensured.user_id, { limit: 50 });

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted">
            CRUD-only. No tags, beliefs, or predictions yet.
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm">
            Home
          </Button>
        </Link>
      </header>

      {searchParams?.error === "validation" ? (
        <div className="rounded-xl border border-accent/30 bg-panel/60 p-3 text-sm text-accent">
          Invalid input. Please try again.
        </div>
      ) : null}

      <JournalEntryForm
        title="New entry"
        submitLabel="Create"
        action={createJournalEntryAction}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Last 50</h2>
        <JournalEntriesList entries={entries} />
      </section>
    </main>
  );
}
