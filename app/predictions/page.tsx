import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ensureUser } from "@/services/auth/ensure-user";
import { listOpen } from "@/db/predictions";
import { ensure as ensurePaperAccount } from "@/db/paper_accounts";
import { listOpenByPredictionIds } from "@/db/paper_positions";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { createPredictionAction } from "@/app/predictions/actions";
import { PredictionsList } from "@/app/predictions/_components/predictions-list";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";

export const dynamic = "force-dynamic";

export default async function PredictionsIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string; prefill?: string; resolve_by?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const predictions = await listOpen(ensured.user_id, { limit: 200 });
  const account = await ensurePaperAccount(ensured.user_id);
  const openPositions = await listOpenByPredictionIds(
    ensured.user_id,
    predictions.map((p) => p.id),
  );
  const positionsByPredictionId: Record<
    string,
    { yes_stake: number; no_stake: number; total_stake: number }
  > = {};
  for (const pos of openPositions) {
    const curr = positionsByPredictionId[pos.prediction_id] ?? {
      yes_stake: 0,
      no_stake: 0,
      total_stake: 0,
    };
    if (pos.side === "yes") curr.yes_stake += pos.stake;
    else curr.no_stake += pos.stake;
    curr.total_stake += pos.stake;
    positionsByPredictionId[pos.prediction_id] = curr;
  }

  const prefill = searchParams?.prefill?.trim();
  const resolveBy = searchParams?.resolve_by?.trim();

  const exposure = openPositions.reduce((sum, b) => sum + b.stake, 0);
  const positionedPredictions = new Set(openPositions.map((p) => p.prediction_id)).size;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PolymarketEventSearchBanner
        density="compact"
        defaultCarouselOpen={false}
        storageKey="pj_polymarket_carousel_open_predictions"
      />

      <PageHeader
        title="Predictions"
        subtitle="Binary, resolvable predictions (no analytics)."
        actions={
          <Link href="/">
            <Button variant="secondary" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <Panel className="p-4">
        <Section
          title="Paper portfolio"
          hint="Fixed-odds paper trades against your own reference line (no live pricing)."
          density="compact"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <InsetPanel className="rounded-2xl p-2.5">
              <div className="text-xs text-muted">Balance</div>
              <div className="mt-0.5 text-base font-semibold">
                {Math.round(account.balance)}
              </div>
            </InsetPanel>
            <InsetPanel className="rounded-2xl p-2.5">
              <div className="text-xs text-muted">At risk</div>
              <div className="mt-0.5 text-base font-semibold">{Math.round(exposure)}</div>
            </InsetPanel>
            <InsetPanel className="rounded-2xl p-2.5">
              <div className="text-xs text-muted">Open positions</div>
              <div className="mt-0.5 text-base font-semibold">
                {openPositions.length}
              </div>
            </InsetPanel>
            <InsetPanel className="rounded-2xl p-2.5">
              <div className="text-xs text-muted">Contracts w/ position</div>
              <div className="mt-0.5 text-base font-semibold">{positionedPredictions}</div>
            </InsetPanel>
          </div>
        </Section>
      </Panel>

      {searchParams?.error === "validation" ? (
        <Panel className="border-accent/20 bg-panel/55 p-3 text-sm text-accent">
          Invalid input. Please try again.
        </Panel>
      ) : null}

      <PredictionForm
        title={prefill ? "New prediction (prefilled)" : "New prediction"}
        submitLabel="Create"
        action={createPredictionAction}
        defaultValues={
          prefill || resolveBy
            ? {
                question: prefill ?? "",
                resolve_by: resolveBy,
              }
            : undefined
        }
      />

      <Section title="Open" density="compact">
        <PredictionsList
          predictions={predictions}
          positionsByPredictionId={positionsByPredictionId}
        />
      </Section>
    </main>
  );
}
