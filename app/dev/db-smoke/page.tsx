import { revalidatePath } from "next/cache";

import { ensureUser } from "@/services/auth/ensure-user";
import { create, listByType } from "@/db/truth_objects";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { normalizeHandle } from "@/lib/handles";

async function createDbSmokeEntryAction() {
  "use server";
  const ensured = await ensureUser();
  const body = `db-smoke: ${new Date().toISOString()}`;
  await create(ensured.user_id, {
    type: "note",
    title: "db-smoke",
    body,
    handle: normalizeHandle(`db-smoke-${new Date().toISOString().slice(0, 10)}`),
    metadata: {},
  });
  revalidatePath("/dev/db-smoke");
}

export default async function DbSmokePage() {
  const ensured = await ensureUser();
  const entries = await listByType(ensured.user_id, "note", { limit: 5 });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <PageHeader
        title="DB Smoke Test"
        subtitle={
          <>
            Ensured user <span className="font-mono text-text/80">{ensured.user_id}</span> (clerk{" "}
            <span className="font-mono text-text/80">{ensured.clerk_user_id}</span>)
          </>
        }
      />

      <Panel className="p-5">
        <div className="flex items-center justify-end">
          <form action={createDbSmokeEntryAction}>
            <Button type="submit" size="sm">
              Insert smoke entry
            </Button>
          </form>
        </div>

        <Section title="Last 5 journal entries">
          <ol className="space-y-3 text-sm">
            {entries.map((e) => (
              <li key={e.id}>
                <InsetPanel className="rounded-2xl p-4">
                  <div className="font-mono text-xs text-muted">{e.created_at}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-text/85">{e.body}</div>
                </InsetPanel>
              </li>
            ))}
          </ol>
        </Section>
      </Panel>
    </main>
  );
}
