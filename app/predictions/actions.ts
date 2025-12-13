"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { create, deleteById, get, listOpen, update } from "@/db/predictions";
import { ensureUser } from "@/services/auth/ensure-user";
import {
  predictionCreateSchema,
  predictionDeleteSchema,
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
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  const row = await create(ensured.user_id, {
    claim: parsed.data.question,
    confidence: parsed.data.confidence,
    resolution_date: parsed.data.resolve_by,
  });

  revalidatePath("/predictions");
  redirect(`/predictions/${row.id}`);
}

export async function updatePredictionAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = predictionUpdateSchema.safeParse({
    id: getString(formData, "id"),
    question: getString(formData, "question"),
    confidence: getString(formData, "confidence"),
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) redirect("/predictions?error=validation");

  const existing = await get(ensured.user_id, parsed.data.id);
  if (!existing) redirect("/predictions");
  if (existing.resolved_at || existing.outcome) redirect(`/predictions/${existing.id}`);

  const updated = await update(ensured.user_id, parsed.data.id, {
    claim: parsed.data.question,
    confidence: parsed.data.confidence,
    resolution_date: parsed.data.resolve_by,
  });

  if (!updated) redirect("/predictions");

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

  const existing = await get(ensured.user_id, parsed.data.id);
  if (!existing) redirect("/predictions");
  if (existing.resolved_at || existing.outcome) redirect(`/predictions/${existing.id}`);

  await deleteById(ensured.user_id, parsed.data.id);

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

  const existing = await get(ensured.user_id, parsed.data.id);
  if (!existing) redirect("/predictions");
  if (existing.resolved_at || existing.outcome) redirect(`/predictions/${existing.id}`);

  const resolved = await update(ensured.user_id, parsed.data.id, {
    resolved_at: new Date().toISOString(),
    outcome: parsed.data.outcome,
    resolution_note: parsed.data.note,
  });

  if (!resolved) redirect("/predictions");

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);
}

// Convenience helper for pages that only need open predictions.
export async function listOpenPredictionsForCurrentUser() {
  const ensured = await ensureUser();
  return listOpen(ensured.user_id, { limit: 200 });
}

