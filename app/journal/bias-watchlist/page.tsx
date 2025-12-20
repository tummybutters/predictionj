import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";

export default async function JournalBiasWatchlistPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Bias Watchlist"
        subtitle="Recurring failure modes, triggers, and countermeasures."
      />
      <Panel className="p-6">
        <div className="text-sm font-semibold text-text/90">Coming soon</div>
        <div className="mt-2 text-sm text-muted">
          This view will track biases you want Qortana to actively watch for.
        </div>
      </Panel>
    </main>
  );
}

