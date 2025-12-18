import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ensureUser } from "@/services/auth/ensure-user";
import { getOpenPredictionsIndexData } from "@/services/predictions";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { createPredictionAction } from "@/app/predictions/actions";
import { PredictionsList } from "@/app/predictions/_components/predictions-list";
import { ClaimsVisualize } from "@/app/predictions/_components/claims-visualize";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";

export default async function PredictionsIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string; prefill?: string; resolve_by?: string };
}) {
  const ensured = await ensureUser();
  const { predictions, account, positionsByPredictionId, exposure, positionedPredictions, openPositionsCount } =
    await getOpenPredictionsIndexData(ensured.user_id);

  const prefill = searchParams?.prefill?.trim();
  const resolveBy = searchParams?.resolve_by?.trim();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 pb-8 pt-24">
      <PolymarketEventSearchBanner
        density="compact"
        defaultCarouselOpen={false}
        storageKey="pj_polymarket_carousel_open_predictions"
      />

      <PageHeader
        title="Predictions"
        subtitle="A workspace for resolvable claims: visualize, update, and paper trade."
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
                {openPositionsCount}
              </div>
            </InsetPanel>
            <InsetPanel className="rounded-2xl p-2.5">
              <div className="text-xs text-muted">Contracts w/ position</div>
              <div className="mt-0.5 text-base font-semibold">{positionedPredictions}</div>
            </InsetPanel>
          </div>
        </Section>
      </Panel>

      <ClaimsVisualize
        predictions={predictions}
        positionsByPredictionId={positionsByPredictionId}
        accountBalance={account.balance}
      />

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
