import { ensureUser } from "@/services/auth/ensure-user";
import { listEntries } from "@/services/journal";
import { JournalShell } from "@/app/journal/_components/journal-shell";

export default async function JournalLayout({ children }: { children: React.ReactNode }) {
  const ensured = await ensureUser();
  const entries = await listEntries(ensured.user_id, { limit: 200 });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <JournalShell initialEntries={entries}>{children}</JournalShell>
    </main>
  );
}
