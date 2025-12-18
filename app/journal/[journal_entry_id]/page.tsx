import { notFound } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { getEntry } from "@/services/journal";
import { JournalEditor } from "@/app/journal/_components/journal-editor";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: { journal_entry_id: string };
}) {
  const ensured = await ensureUser();
  const entry = await getEntry(ensured.user_id, params.journal_entry_id);

  if (!entry) notFound();

  return (
    <JournalEditor entry={entry} />
  );
}
