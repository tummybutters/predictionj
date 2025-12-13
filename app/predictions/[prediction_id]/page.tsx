import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { get } from "@/db/predictions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ensureUser } from "@/services/auth/ensure-user";
import { PredictionForm } from "@/app/predictions/_components/prediction-form";
import {
  deletePredictionAction,
  resolvePredictionAction,
  updatePredictionAction,
} from "@/app/predictions/actions";

export const dynamic = "force-dynamic";

export default async function PredictionDetailPage({
  params,
}: {
  params: { prediction_id: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ensured = await ensureUser();
  const prediction = await get(ensured.user_id, params.prediction_id);

  if (!prediction) notFound();

  const isResolved = Boolean(prediction.resolved_at || prediction.outcome);
  const confidence = Number(prediction.confidence);
  const percent = Number.isFinite(confidence) ? Math.round(confidence * 100) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/predictions">
          <Button variant="secondary" size="sm">
            Back
          </Button>
        </Link>
        <div className="text-xs text-muted">
          Status:{" "}
          <span className="font-medium">{isResolved ? "resolved" : "open"}</span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Details</div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">{prediction.claim}</div>
          <div className="text-sm text-muted">
            Confidence: {percent ?? "?"}% · Resolve by: {prediction.resolution_date}
          </div>
          {isResolved ? (
            <div className="text-sm">
              Resolution:{" "}
              <span className="font-medium">{prediction.outcome}</span>
              <span className="text-muted">
                {" "}
                (resolved_at: {prediction.resolved_at})
              </span>
            </div>
          ) : null}
          {prediction.resolution_note ? (
            <div className="rounded-xl border border-border/25 bg-panel/50 p-3 text-sm">
              <div className="text-xs font-medium text-muted">
                Resolution note
              </div>
              <div className="mt-1 whitespace-pre-wrap">
                {prediction.resolution_note}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PredictionForm
        title="Edit (open only)"
        submitLabel="Save"
        action={updatePredictionAction}
        disabled={isResolved}
        defaultValues={{
          id: prediction.id,
          question: prediction.claim,
          confidence: Number(prediction.confidence),
          resolve_by: prediction.resolution_date,
        }}
      />

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Resolve</div>
          <div className="mt-1 text-sm text-muted">
            Resolving makes the prediction immutable.
          </div>
        </CardHeader>
        <CardContent>
          <form action={resolvePredictionAction} className="space-y-4">
            <input type="hidden" name="id" value={prediction.id} />

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <select
                id="outcome"
                name="outcome"
                required
                disabled={isResolved}
                className="flex h-10 w-full rounded-xl border border-border/25 bg-panel/55 px-3 py-2 text-sm text-text shadow-plush placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                name="note"
                disabled={isResolved}
                placeholder="Why did it resolve this way?"
              />
            </div>

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={isResolved}>
                Resolve prediction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <form action={deletePredictionAction}>
        <input type="hidden" name="id" value={prediction.id} />
        <Button variant="destructive" type="submit" disabled={isResolved}>
          Delete (open only)
        </Button>
      </form>
    </main>
  );
}
