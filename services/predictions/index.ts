import "server-only";

import { createForecast } from "@/db/prediction_forecasts";
import { ensure as ensurePaperAccount, updateBalance } from "@/db/paper_accounts";
import { createEntry as createPaperLedgerEntry } from "@/db/paper_ledger";
import {
  createOpenPosition,
  settleOpenPositionsForPrediction,
  type PaperPositionRow,
} from "@/db/paper_positions";
import {
  create as createPrediction,
  deleteById as deletePredictionById,
  get as getPrediction,
  listOpen as listOpenPredictions,
  update as updatePrediction,
  type PredictionOutcome,
  type PredictionRow,
} from "@/db/predictions";

function assertOpenPrediction(prediction: PredictionRow) {
  if (prediction.resolved_at || prediction.outcome) {
    throw new Error("Prediction is resolved.");
  }
}

function computeFixedOddsPayout(params: {
  stake: number;
  line: number;
  side: "yes" | "no";
  outcome: Exclude<PredictionOutcome, "unknown">;
}): { payout: number; pnl: number } {
  const stake = params.stake;
  const line = params.line;
  const yesPrice = line;
  const noPrice = 1 - line;

  if (params.side === "yes") {
    const payout = params.outcome === "true" ? stake / yesPrice : 0;
    return { payout, pnl: payout - stake };
  }

  const payout = params.outcome === "false" ? stake / noPrice : 0;
  return { payout, pnl: payout - stake };
}

export async function listOpen(userId: string, options?: { limit?: number }) {
  return listOpenPredictions(userId, options);
}

export async function createWithInitialForecast(
  userId: string,
  input: {
    question: string;
    confidence: number;
    reference_line: number;
    resolve_by: string;
  },
): Promise<PredictionRow> {
  const row = await createPrediction(userId, {
    claim: input.question,
    confidence: input.confidence,
    reference_line: input.reference_line,
    resolution_date: input.resolve_by,
  });

  await createForecast({
    user_id: userId,
    prediction_id: row.id,
    probability: input.confidence,
    note: null,
  });

  return row;
}

export async function updateOpenPrediction(
  userId: string,
  input: {
    id: string;
    question: string;
    confidence: number;
    reference_line: number;
    resolve_by: string;
  },
): Promise<PredictionRow> {
  const existing = await getPrediction(userId, input.id);
  if (!existing) throw new Error("Prediction not found.");
  assertOpenPrediction(existing);

  const confidenceChanged = input.confidence !== existing.confidence;

  const updated = await updatePrediction(userId, input.id, {
    claim: input.question,
    confidence: input.confidence,
    reference_line: input.reference_line,
    resolution_date: input.resolve_by,
  });

  if (!updated) throw new Error("Prediction not found.");

  if (confidenceChanged) {
    await createForecast({
      user_id: userId,
      prediction_id: input.id,
      probability: input.confidence,
      note: "Edited prediction confidence.",
    });
  }

  return updated;
}

export async function deleteOpenPrediction(userId: string, predictionId: string) {
  const existing = await getPrediction(userId, predictionId);
  if (!existing) throw new Error("Prediction not found.");
  assertOpenPrediction(existing);
  await deletePredictionById(userId, predictionId);
}

export async function resolveAndSettlePaperPositions(
  userId: string,
  input: { id: string; outcome: Exclude<PredictionOutcome, "unknown">; note: string | null },
): Promise<PredictionRow> {
  const existing = await getPrediction(userId, input.id);
  if (!existing) throw new Error("Prediction not found.");
  assertOpenPrediction(existing);

  const resolved = await updatePrediction(userId, input.id, {
    resolved_at: new Date().toISOString(),
    outcome: input.outcome,
    resolution_note: input.note,
  });
  if (!resolved) throw new Error("Prediction not found.");

  const account = await ensurePaperAccount(userId);
  let nextBalance = account.balance;
  const settledPositions = await settleOpenPositionsForPrediction({
    user_id: userId,
    prediction_id: input.id,
    outcome: input.outcome,
    compute: (position: PaperPositionRow) =>
      computeFixedOddsPayout({
        stake: position.stake,
        line: position.line,
        side: position.side,
        outcome: input.outcome,
      }),
  });

  for (const p of settledPositions) {
    const payout = p.payout ?? 0;
    nextBalance += payout;
    nextBalance = Math.max(0, Math.round(nextBalance * 100) / 100);
    await updateBalance(userId, nextBalance);
    await createPaperLedgerEntry({
      user_id: userId,
      prediction_id: input.id,
      kind: "settle_position",
      delta: payout,
      balance_after: nextBalance,
      memo: `Settled ${p.side.toUpperCase()} @ ${Math.round(p.line * 100)}% (PnL ${Math.round(
        (p.pnl ?? 0) * 100,
      ) / 100}).`,
    });
  }

  return resolved;
}

export async function updateForecast(
  userId: string,
  input: { prediction_id: string; probability: number; note: string | null },
) {
  const prediction = await getPrediction(userId, input.prediction_id);
  if (!prediction) throw new Error("Prediction not found.");
  assertOpenPrediction(prediction);

  await updatePrediction(userId, input.prediction_id, {
    confidence: input.probability,
  });
  await createForecast({
    user_id: userId,
    prediction_id: input.prediction_id,
    probability: input.probability,
    note: input.note,
  });
}

export async function updateLine(
  userId: string,
  input: { prediction_id: string; reference_line: number },
) {
  const prediction = await getPrediction(userId, input.prediction_id);
  if (!prediction) throw new Error("Prediction not found.");
  assertOpenPrediction(prediction);

  await updatePrediction(userId, input.prediction_id, {
    reference_line: input.reference_line,
  });
}

export async function openPaperPositionWorkflow(
  userId: string,
  input: { prediction_id: string; side: "yes" | "no"; stake: number },
) {
  const prediction = await getPrediction(userId, input.prediction_id);
  if (!prediction) throw new Error("Prediction not found.");
  assertOpenPrediction(prediction);

  const line = Number(prediction.reference_line);
  if (!Number.isFinite(line) || line <= 0 || line >= 1) throw new Error("Invalid line.");

  const account = await ensurePaperAccount(userId);
  if (input.stake > account.balance) {
    throw new Error(`Insufficient balance. Available: ${Math.floor(account.balance)}.`);
  }

  const nextBalance = Math.max(0, Math.round((account.balance - input.stake) * 100) / 100);
  await updateBalance(userId, nextBalance);
  const position = await createOpenPosition({
    user_id: userId,
    prediction_id: input.prediction_id,
    side: input.side,
    stake: input.stake,
    line,
  });

  await createPaperLedgerEntry({
    user_id: userId,
    prediction_id: input.prediction_id,
    kind: "open_position",
    delta: -input.stake,
    balance_after: nextBalance,
    memo: `Opened ${position.side.toUpperCase()} @ ${Math.round(line * 100)}% (stake ${Math.round(
      position.stake,
    )}).`,
  });
}
