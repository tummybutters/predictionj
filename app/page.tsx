import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/services/dashboard/get-dashboard";
import { QuickCapture } from "@/components/home/quick-capture";
import { MarketLinksCard } from "@/components/home/market-links";

export const dynamic = "force-dynamic";

function formatDateTime(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dashboard = await getDashboard();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Read-only. Computed from your existing data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/journal">
            <Button variant="secondary" size="sm">
              Journal
            </Button>
          </Link>
          <Link href="/predictions">
            <Button variant="secondary" size="sm">
              Predictions
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex justify-end sm:order-2">
          <QuickCapture />
        </div>
        <div className="flex justify-start sm:order-1">
          <MarketLinksCard />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Quick Stats</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium">Journal entries</div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Last 7 days</span>
                <span className="font-medium">
                  {dashboard.quick_stats.journal_entries.last_7_days}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Last 30 days</span>
                <span className="font-medium">
                  {dashboard.quick_stats.journal_entries.last_30_days}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">All-time</span>
                <span className="font-medium">
                  {dashboard.quick_stats.journal_entries.all_time}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-sm font-medium">Predictions</div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Open</span>
                <span className="font-medium">
                  {dashboard.quick_stats.predictions.open}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Resolved</span>
                <span className="font-medium">
                  {dashboard.quick_stats.predictions.resolved}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Due Soon</h2>
        <Card>
          <CardContent className="p-4">
            {dashboard.due_soon.length === 0 ? (
              <div className="text-sm text-muted">No predictions due soon.</div>
            ) : (
              <ol className="space-y-3">
                {dashboard.due_soon.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/predictions/${p.id}`} className="text-sm font-medium hover:underline">
                        {p.question}
                      </Link>
                      <div className="mt-1 text-sm text-muted">
                        Confidence: {p.confidence_percent}% · Resolve by: {p.resolve_by}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Recently Resolved</h2>
        <Card>
          <CardContent className="p-4">
            {dashboard.recently_resolved.length === 0 ? (
              <div className="text-sm text-muted">No resolved predictions yet.</div>
            ) : (
              <ol className="space-y-3">
                {dashboard.recently_resolved.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/predictions/${p.id}`} className="text-sm font-medium hover:underline">
                        {p.question}
                      </Link>
                      <div className="mt-1 text-sm text-muted">
                        Confidence: {p.confidence_percent}% · Resolution:{" "}
                        <span className="font-medium">{p.resolution ? "✅" : "❌"}</span> · Resolved:{" "}
                        {formatDateTime(p.resolved_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Recent Journal</h2>
        <Card>
          <CardContent className="p-4">
            {dashboard.recent_journal.length === 0 ? (
              <div className="text-sm text-muted">No journal entries yet.</div>
            ) : (
              <ol className="space-y-3">
                {dashboard.recent_journal.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/journal/${e.id}`} className="text-sm font-medium hover:underline">
                        {e.title}
                      </Link>
                      <div className="mt-1 font-mono text-xs text-muted">
                        {formatDateTime(e.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
