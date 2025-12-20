import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Home"
        subtitle="A calm dashboard for your markets, journal, and mental model."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/journal"
              className="inline-flex rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
            >
              View Journal
            </Link>
            <Link
              href="/journal/predictions"
              className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
            >
              New Prediction
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Coach Insight</div>
          <div className="mt-2 text-sm text-muted">
            Personalized guidance and bias detection will live here.
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Assumption Tracker</div>
          <div className="mt-2 text-sm text-muted">
            Validation progress + critical open assumptions.
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Active Predictions</div>
          <div className="mt-2 text-sm text-muted">Quick status and confidence snapshots.</div>
        </Panel>
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Top Markets</div>
          <div className="mt-2 text-sm text-muted">Trending + your watchlist signals.</div>
        </Panel>
      </div>

      <Panel className="p-6">
        <div className="text-sm font-semibold text-text/90">Upcoming</div>
        <div className="mt-2 text-sm text-muted">
          Calendar-driven prompts for prep, evidence, and decision rules.
        </div>
      </Panel>
    </main>
  );
}
