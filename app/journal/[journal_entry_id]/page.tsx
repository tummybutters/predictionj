import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { get } from "@/db/journal_entries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  deleteJournalEntryAction,
  updateJournalEntryAction,
} from "@/app/journal/actions";
import { ensureUser } from "@/services/auth/ensure-user";
import { JournalEntryForm } from "@/app/journal/_components/journal-entry-form";

export const dynamic = "force-dynamic";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: { journal_entry_id: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const entry = await get(ensured.user_id, params.journal_entry_id);

  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/journal">
          <Button variant="secondary" size="sm">
            Back
          </Button>
        </Link>
        <div className="font-mono text-xs text-muted">{entry.entry_at}</div>
      </header>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">
            {entry.title?.trim() ? entry.title : "Untitled"}
          </div>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm">{entry.body}</div>
        </CardContent>
      </Card>

      <JournalEntryForm
        title="Edit entry"
        submitLabel="Save"
        action={updateJournalEntryAction}
        defaultValues={{
          id: entry.id,
          title: entry.title,
          body: entry.body,
        }}
      />

      <form action={deleteJournalEntryAction}>
        <input type="hidden" name="id" value={entry.id} />
        <Button variant="destructive" type="submit">
          Delete
        </Button>
      </form>
    </main>
  );
}
