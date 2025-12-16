import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ensureUser } from "@/services/auth/ensure-user";
import { listOpen } from "@/db/predictions";
import { ensure as ensureBankroll } from "@/db/bankroll";
import { listOpenByPredictionIds } from "@/db/prediction_bets";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { createPredictionAction } from "@/app/predictions/actions";
import { PredictionsList } from "@/app/predictions/_components/predictions-list";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
  const bankroll = await ensureBankroll(ensured.user_id);
  const bets = await listOpenByPredictionIds(
    ensured.user_id,
    predictions.map((p) => p.id),
  );
  const betsByPredictionId = Object.fromEntries(
    bets.map((b) => [b.prediction_id, b]),
  );

  const prefill = searchParams?.prefill?.trim();
  const resolveBy = searchParams?.resolve_by?.trim();

  const exposure = bets.reduce((sum, b) => sum + b.stake, 0);
  const expectedValue = bets.reduce((sum, b) => {
    const p = b.confidence;
    return sum + b.stake * (2 * p - 1) * (2 * p - 1);
  }, 0);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <PolymarketEventSearchBanner />

      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Predictions</h1>
          <p className="mt-1 text-sm text-muted">
            Binary, resolvable predictions (no analytics).
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm">
            Home
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Dummy Polymarket account</div>
          <div className="mt-1 text-sm text-muted">
            Bankroll tracks wagered performance on your predictions.
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/25 bg-panel/40 p-3">
            <div className="text-xs text-muted">Credits</div>
            <div className="mt-1 text-lg font-semibold">
              {Math.round(bankroll.balance)}
            </div>
          </div>
          <div className="rounded-xl border border-border/25 bg-panel/40 p-3">
            <div className="text-xs text-muted">Busts</div>
            <div className="mt-1 text-lg font-semibold">{bankroll.bust_count}</div>
          </div>
          <div className="rounded-xl border border-border/25 bg-panel/40 p-3">
            <div className="text-xs text-muted">Exposure</div>
            <div className="mt-1 text-lg font-semibold">{Math.round(exposure)}</div>
          </div>
          <div className="rounded-xl border border-border/25 bg-panel/40 p-3">
            <div className="text-xs text-muted">EV (self-scored)</div>
            <div className="mt-1 text-lg font-semibold">
              {Math.round(expectedValue)}
            </div>
          </div>
        </CardContent>
      </Card>

      {searchParams?.error === "validation" ? (
        <div className="rounded-xl border border-accent/30 bg-panel/60 p-3 text-sm text-accent">
          Invalid input. Please try again.
        </div>
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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Open</h2>
        <PredictionsList predictions={predictions} betsByPredictionId={betsByPredictionId} />
      </section>
    </main>
  );
}
