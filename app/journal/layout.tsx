import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { list } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import { JournalShell } from "@/app/journal/_components/journal-shell";

export const dynamic = "force-dynamic";

export default async function JournalLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const entries = await list(ensured.user_id, { limit: 200 });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <JournalShell initialEntries={entries}>{children}</JournalShell>
    </main>
  );
}

