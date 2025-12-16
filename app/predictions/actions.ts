"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { create, deleteById, get, listOpen, update } from "@/db/predictions";
import { ensure as ensureBankroll, update as updateBankroll } from "@/db/bankroll";
import {
  deleteOpenBet,
  getOpenByPredictionId,
  listOpenStakes,
  settleOpenBet,
  upsertOpenBet,
} from "@/db/prediction_bets";
import { createTransaction } from "@/db/bankroll_transactions";
import { ensureUser } from "@/services/auth/ensure-user";
import {
  predictionCreateSchema,
  predictionBetDeleteSchema,
  predictionBetUpsertSchema,
  predictionDeleteSchema,
  predictionResolveSchema,
  predictionUpdateSchema,
} from "@/lib/validation/prediction";

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

function computeWageredScoreDelta(params: {
  stake: number;
  confidence: number; // p in [0, 1]
  outcome: "true" | "false";
}): number {
  const p = params.confidence;
  const y = params.outcome === "true" ? 1 : 0;
  const stake = params.stake;
  const delta = stake * (1 - 4 * (p - y) * (p - y));
  return Math.round(delta * 100) / 100;
}

async function settleBetAndBankroll(params: {
  userId: string;
  predictionId: string;
  outcome: "true" | "false";
}) {
  const bet = await getOpenByPredictionId(params.userId, params.predictionId);
  if (!bet) return;

  const delta = computeWageredScoreDelta({
    stake: bet.stake,
    confidence: bet.confidence,
    outcome: params.outcome,
  });

  await settleOpenBet(params.userId, params.predictionId, {
    outcome: params.outcome,
    pnl: delta,
  });

  const bankroll = await ensureBankroll(params.userId);
  const rawNext = bankroll.balance + delta;
  const nextBalance = Math.max(0, Math.round(rawNext * 100) / 100);

  if (nextBalance <= 0) {
    const resetBalance = bankroll.starting_balance;
    const nextAllTimeHigh = Math.max(bankroll.all_time_high, bankroll.balance);

    await updateBankroll(params.userId, {
      balance: resetBalance,
      bust_count: bankroll.bust_count + 1,
      last_bust_at: new Date().toISOString(),
      all_time_high: nextAllTimeHigh,
    });

    await createTransaction({
      user_id: params.userId,
      prediction_id: params.predictionId,
      kind: "bet_settle",
      delta,
      balance_after: 0,
      memo: `Busted (auto-reset to ${resetBalance}).`,
    });

    await createTransaction({
      user_id: params.userId,
      prediction_id: params.predictionId,
      kind: "bust_reset",
      delta: resetBalance,
      balance_after: resetBalance,
      memo: "Auto-reset after bust.",
    });

    return;
  }

  const nextAllTimeHigh = Math.max(bankroll.all_time_high, nextBalance);
  await updateBankroll(params.userId, {
    balance: nextBalance,
    all_time_high: nextAllTimeHigh,
  });

  await createTransaction({
    user_id: params.userId,
    prediction_id: params.predictionId,
    kind: "bet_settle",
    delta,
    balance_after: nextBalance,
  });
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

  await settleBetAndBankroll({
    userId: ensured.user_id,
    predictionId: parsed.data.id,
    outcome: parsed.data.outcome,
  });

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);
}

export async function upsertPredictionBet(input: {
  prediction_id: string;
  stake: unknown;
}) {
  const ensured = await ensureUser();

  const parsed = predictionBetUpsertSchema.safeParse({
    prediction_id: input.prediction_id,
    stake: input.stake,
  });
  if (!parsed.success) throw new Error("Invalid stake.");

  const prediction = await get(ensured.user_id, parsed.data.prediction_id);
  if (!prediction) throw new Error("Prediction not found.");
  if (prediction.resolved_at || prediction.outcome) throw new Error("Prediction is resolved.");

  const bankroll = await ensureBankroll(ensured.user_id);
  const openStakes = await listOpenStakes(ensured.user_id);
  const exposure = openStakes.reduce((sum, b) => sum + b.stake, 0);
  const existingStake =
    openStakes.find((b) => b.prediction_id === parsed.data.prediction_id)?.stake ?? 0;
  const available = Math.max(0, bankroll.balance - (exposure - existingStake));
  if (parsed.data.stake > available) {
    throw new Error(`Insufficient credits. Available: ${Math.floor(available)}.`);
  }

  const confidence = Number(prediction.confidence);
  if (!Number.isFinite(confidence)) throw new Error("Invalid prediction confidence.");

  await upsertOpenBet(ensured.user_id, parsed.data.prediction_id, {
    stake: parsed.data.stake,
    confidence,
  });

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.prediction_id}`);
}

export async function deletePredictionBet(input: { prediction_id: string }) {
  const ensured = await ensureUser();
  const parsed = predictionBetDeleteSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid request.");

  await deleteOpenBet(ensured.user_id, parsed.data.prediction_id);
  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.prediction_id}`);
}

// Convenience helper for pages that only need open predictions.
export async function listOpenPredictionsForCurrentUser() {
  const ensured = await ensureUser();
  return listOpen(ensured.user_id, { limit: 200 });
}
