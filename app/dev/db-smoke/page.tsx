import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { create, list } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";

export const dynamic = "force-dynamic";

export default async function DbSmokePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();

  await create(ensured.user_id, {
    body: `db-smoke: ${new Date().toISOString()}`,
  });

  const entries = await list(ensured.user_id, { limit: 5 });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-semibold">DB Smoke Test</h1>
      <p className="mt-2 text-sm text-muted">
        Ensured user: {ensured.user_id} (clerk: {ensured.clerk_user_id})
      </p>
      <h2 className="mt-6 text-sm font-medium">Last 5 journal entries</h2>
      <ol className="mt-2 space-y-3 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="glass-panel rounded-xl p-3">
            <div className="font-mono text-xs text-muted">{e.entry_at}</div>
            <div className="mt-1 whitespace-pre-wrap">{e.body}</div>
          </li>
        ))}
      </ol>
    </main>
  );
}
