import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { create, list } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { InsetPanel, Panel } from "@/components/ui/panel";

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
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <PageHeader
        title="DB Smoke Test"
        subtitle={
          <>
            Ensured user{" "}
            <span className="font-mono text-text/80">{ensured.user_id}</span> (clerk{" "}
            <span className="font-mono text-text/80">{ensured.clerk_user_id}</span>)
          </>
        }
      />

      <Panel className="p-5">
        <Section title="Last 5 journal entries">
          <ol className="space-y-3 text-sm">
            {entries.map((e) => (
              <li key={e.id}>
                <InsetPanel className="rounded-2xl p-4">
                  <div className="font-mono text-xs text-muted">{e.entry_at}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-text/85">
                    {e.body}
                  </div>
                </InsetPanel>
              </li>
            ))}
          </ol>
        </Section>
      </Panel>
    </main>
  );
}
