import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";

export default async function OverviewPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Overview"
        subtitle="A snapshot of your portfolio, predictions, and journal health."
        actions={
          <Link
            href="/overview/portfolio"
            className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
          >
            View Portfolio
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Calibration
          </div>
          <div className="mt-2 text-2xl font-semibold text-text/90">—</div>
          <div className="mt-1 text-sm text-muted">Coming soon</div>
        </Panel>
        <Panel className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Open Predictions
          </div>
          <div className="mt-2 text-2xl font-semibold text-text/90">—</div>
          <div className="mt-1 text-sm text-muted">Coming soon</div>
        </Panel>
        <Panel className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Journal Objects
          </div>
          <div className="mt-2 text-2xl font-semibold text-text/90">—</div>
          <div className="mt-1 text-sm text-muted">Coming soon</div>
        </Panel>
      </div>

      <Panel className="p-6">
        <div className="text-sm font-semibold text-text/90">Visualizations</div>
        <div className="mt-2 text-sm text-muted">
          This page will become the home for “mind analytics” dashboards and summaries.
        </div>
      </Panel>
    </main>
  );
}

