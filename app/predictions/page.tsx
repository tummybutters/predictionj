import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ensureUser } from "@/services/auth/ensure-user";
import { listOpen } from "@/db/predictions";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import { createPredictionAction } from "@/app/predictions/actions";
import { PredictionsSearchShell } from "@/app/predictions/_components/predictions-search-shell";

export const dynamic = "force-dynamic";

export default async function PredictionsIndexPage({
  searchParams,
}: {
  searchParams?: { error?: string; q?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const predictions = await listOpen(ensured.user_id, { limit: 200 });

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <PredictionsSearchShell
        predictions={predictions}
        initialQuery={searchParams?.q}
      >
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
          title="New prediction"
          submitLabel="Create"
          action={createPredictionAction}
        />
      </PredictionsSearchShell>
    </main>
  );
}
