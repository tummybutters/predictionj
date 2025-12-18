import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { getDashboard } from "@/services/dashboard/get-dashboard";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";
import { LandingHero } from "@/components/landing/landing-hero";
import { OnboardingCheck } from "@/components/app/onboarding-check";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { Panel } from "@/components/ui/panel";

function formatDateTime(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) return <LandingHero />;

  const dashboard = await getDashboard();

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 pb-10 pt-24">
      <PolymarketEventSearchBanner />
      <PageHeader
        title="Dashboard"
        subtitle="Read-only. Computed from your existing data."
      />


      <Section title="Quick Stats">
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel className="p-5">
            <div className="text-sm font-semibold tracking-[-0.01em] text-text/80">
              Journal entries
            </div>
            <div className="mt-3 space-y-1 text-sm">
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
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="text-sm font-semibold tracking-[-0.01em] text-text/80">
              Predictions
            </div>
            <div className="mt-3 space-y-1 text-sm">
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
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Due Soon">
        <Panel>
          <div className="p-5">
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
          </div>
        </Panel>
      </Section>

      <Section title="Recently Resolved">
        <Panel>
          <div className="p-5">
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
          </div>
        </Panel>
      </Section>

      <Section title="Recent Journal">
        <Panel>
          <div className="p-5">
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
          </div>
        </Panel>
      </Section>
    </main>
  );
}
