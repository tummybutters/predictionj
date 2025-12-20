import { notFound } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { getById } from "@/db/truth_objects";
import { JournalEditor } from "@/app/journal/_components/journal-editor";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: { note_id: string };
}) {
  const ensured = await ensureUser();
  const entry = await getById(ensured.user_id, params.note_id);

  if (!entry || entry.type !== "note") notFound();

  return <JournalEditor entry={entry} />;
}
