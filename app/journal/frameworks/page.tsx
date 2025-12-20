import Link from "next/link";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { listByType, type TruthObjectRow } from "@/db/truth_objects";
import { createTruthObjectAction } from "@/app/journal/_actions/truth-objects";
import { PageHeader } from "@/components/app/page-header";
import { BasicTruthObjectEditor } from "@/components/truth-objects/basic-editor";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

function formatUpdatedAt(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function JournalFrameworksPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const ensured = await ensureUser();

  let frameworks: TruthObjectRow[] = [];
  let dbReady = true;
  try {
    frameworks = await listByType(ensured.user_id, "framework", { limit: 120 });
  } catch {
    dbReady = false;
  }

  async function createFramework() {
    "use server";
    const created = await createTruthObjectAction({
      type: "framework",
      title: "New framework",
      body: "",
      handle: "new-framework",
    });
    redirect(`/journal/frameworks?id=${encodeURIComponent(created.id)}`);
  }

  if (!dbReady) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
        <PageHeader
          title="Frameworks"
          subtitle="Apply `db/schema_v2/*` to your Supabase database to enable truth objects."
        />
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Database schema not applied</div>
          <div className="mt-2 text-sm text-muted">
            Run `db/schema_v2/0001_core.sql` then `db/schema_v2/0002_truth_objects.sql`.
          </div>
        </Panel>
      </main>
    );
  }

  const selectedId = searchParams?.id?.trim() || frameworks[0]?.id || "";
  const selected = frameworks.find((b) => b.id === selectedId) ?? frameworks[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Frameworks"
        subtitle="Reusable thinking templates and decision lenses."
        actions={
          <form action={createFramework}>
            <Button variant="secondary" size="sm" type="submit">
              New Framework
            </Button>
          </form>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel className="p-3">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">
              Frameworks
            </div>
            <Pill className="px-2 py-1 font-mono text-[11px]">{frameworks.length}</Pill>
          </div>

          <div className="space-y-2">
            {frameworks.map((b) => {
              const title = (b.title ?? "").trim() || "Untitled";
              const active = selected?.id === b.id;
              return (
                <Link
                  key={b.id}
                  href={`/journal/frameworks?id=${encodeURIComponent(b.id)}`}
                  className={cn(
                    "block rounded-2xl border px-4 py-3 transition-colors",
                    active
                      ? "border-accent/35 bg-accent/10"
                      : "border-border/15 bg-panel/35 hover:bg-panel/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-semibold text-text/85">
                        {title}
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        Updated {formatUpdatedAt(b.updated_at)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        active ? "bg-accent" : "bg-border/40",
                      )}
                    />
                  </div>
                </Link>
              );
            })}

            {frameworks.length === 0 ? (
              <div className="rounded-2xl border border-border/15 bg-panel/35 p-4 text-sm text-muted">
                No frameworks yet. Create one to start a library of reusable thinking.
              </div>
            ) : null}
          </div>
        </Panel>

        {selected ? (
          <BasicTruthObjectEditor object={selected} showSourceUrl={false} />
        ) : (
          <Panel className="p-6">—</Panel>
        )}
      </div>
    </main>
  );
}
