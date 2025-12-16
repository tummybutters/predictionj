"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import {
  createWithInitialForecast,
  deleteOpenPrediction,
  listOpen as listOpenPredictions,
  openPaperPositionWorkflow,
  resolveAndSettlePaperPositions,
  updateForecast,
  updateLine,
  updateOpenPrediction,
} from "@/services/predictions";
import {
  predictionCreateSchema,
  predictionDeleteSchema,
  paperPositionOpenSchema,
  predictionForecastUpdateSchema,
  predictionLineUpdateSchema,
  predictionResolveSchema,
  predictionUpdateSchema,
} from "@/lib/validation/prediction";

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

export async function createPredictionAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = predictionCreateSchema.safeParse({
    question: getString(formData, "question"),
    confidence: getString(formData, "confidence"),
    reference_line: getString(formData, "reference_line"),
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  const row = await createWithInitialForecast(ensured.user_id, parsed.data);

  revalidatePath("/predictions");
  redirect(`/predictions/${row.id}`);
}

export async function updatePredictionAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = predictionUpdateSchema.safeParse({
    id: getString(formData, "id"),
    question: getString(formData, "question"),
    confidence: getString(formData, "confidence"),
    reference_line: getString(formData, "reference_line"),
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  try {
    await updateOpenPrediction(ensured.user_id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Prediction not found.") redirect("/predictions");
    if (msg === "Prediction is resolved.") redirect(`/predictions/${parsed.data.id}`);
    throw e;
  }

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);
}

export async function deletePredictionAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = predictionDeleteSchema.safeParse({
    id: getString(formData, "id"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  try {
    await deleteOpenPrediction(ensured.user_id, parsed.data.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Prediction not found.") redirect("/predictions");
    if (msg === "Prediction is resolved.") redirect(`/predictions/${parsed.data.id}`);
    throw e;
  }

  revalidatePath("/predictions");
  redirect("/predictions");
}

export async function resolvePredictionAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = predictionResolveSchema.safeParse({
    id: getString(formData, "id"),
    outcome: getString(formData, "outcome"),
    note: getString(formData, "note"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  try {
    await resolveAndSettlePaperPositions(ensured.user_id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Prediction not found.") redirect("/predictions");
    if (msg === "Prediction is resolved.") redirect(`/predictions/${parsed.data.id}`);
    throw e;
  }

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);
}

export async function updatePredictionForecast(input: {
  prediction_id: string;
  probability: unknown;
  note?: unknown;
}) {
  const ensured = await ensureUser();
  const parsed = predictionForecastUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid forecast.");

  await updateForecast(ensured.user_id, {
    prediction_id: parsed.data.prediction_id,
    probability: parsed.data.probability,
    note: parsed.data.note,
  });

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.prediction_id}`);
}

export async function updatePredictionLine(input: {
  prediction_id: string;
  reference_line: unknown;
}) {
  const ensured = await ensureUser();
  const parsed = predictionLineUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid line.");

  await updateLine(ensured.user_id, {
    prediction_id: parsed.data.prediction_id,
    reference_line: parsed.data.reference_line,
  });
  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.prediction_id}`);
}

export async function openPaperPosition(input: {
  prediction_id: string;
  side: unknown;
  stake: unknown;
}) {
  const ensured = await ensureUser();
  const parsed = paperPositionOpenSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid position.");

  await openPaperPositionWorkflow(ensured.user_id, parsed.data);

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.prediction_id}`);
}

// Convenience helper for pages that only need open predictions.
export async function listOpenPredictionsForCurrentUser() {
  const ensured = await ensureUser();
  return listOpenPredictions(ensured.user_id, { limit: 200 });
}
