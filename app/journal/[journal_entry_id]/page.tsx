import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { get } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import { JournalEditor } from "@/app/journal/_components/journal-editor";

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
    <JournalEditor entry={entry} />
  );
}
