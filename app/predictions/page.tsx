import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ensureUser } from "@/services/auth/ensure-user";
import { listOpen } from "@/db/predictions";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { createPredictionAction } from "@/app/predictions/actions";
import { PredictionsList } from "@/app/predictions/_components/predictions-list";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";

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

  const prefill = searchParams?.prefill?.trim();
  const resolveBy = searchParams?.resolve_by?.trim();

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
        <PredictionsList predictions={predictions} />
      </section>
    </main>
  );
}
