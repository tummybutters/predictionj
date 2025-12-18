import "server-only";

import { createForecast } from "@/db/prediction_forecasts";
import { ensure as ensurePaperAccount } from "@/db/paper_accounts";
import {
  listByPredictionId as listPaperPositionsByPredictionId,
  listOpenByPredictionIds as listOpenPaperPositionsByPredictionIds,
  type PaperPositionRow,
} from "@/db/paper_positions";
import {
  openPaperPositionAtomic,
  resolvePredictionAndSettlePaperPositionsAtomic,
} from "@/db/paper_trading";
import {
  create as createPrediction,
  deleteById as deletePredictionById,
  get as getPrediction,
  listOpen as listOpenPredictions,
  update as updatePrediction,
  type PredictionOutcome,
  type PredictionRow,
} from "@/db/predictions";
import { listByPredictionId as listForecastsByPredictionId } from "@/db/prediction_forecasts";
import { listRecent as listPaperLedger } from "@/db/paper_ledger";

function assertOpenPrediction(prediction: PredictionRow) {
  if (prediction.resolved_at || prediction.outcome) {
    throw new Error("Prediction is resolved.");
  }
}

function nearlyEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 1e-10;
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

  const confidenceChanged = !nearlyEqual(input.confidence, existing.confidence);

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
  await resolvePredictionAndSettlePaperPositionsAtomic({
    user_id: userId,
    prediction_id: input.id,
    outcome: input.outcome,
    note: input.note,
  });

  const resolved = await getPrediction(userId, input.id);
  if (!resolved) throw new Error("Prediction not found.");
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

  await ensurePaperAccount(userId);
  await openPaperPositionAtomic({
    user_id: userId,
    prediction_id: input.prediction_id,
    side: input.side,
    stake: input.stake,
  });
}

export type PositionSummary = {
  yes_stake: number;
  no_stake: number;
  total_stake: number;
};

export type OpenPredictionsIndexData = {
  predictions: PredictionRow[];
  account: { balance: number };
  positionsByPredictionId: Record<string, PositionSummary>;
  exposure: number;
  positionedPredictions: number;
  openPositionsCount: number;
};

export async function getOpenPredictionsIndexData(userId: string): Promise<OpenPredictionsIndexData> {
  const predictions = await listOpenPredictions(userId, { limit: 200 });
  const account = await ensurePaperAccount(userId);

  const openPositions = await listOpenPaperPositionsByPredictionIds(
    userId,
    predictions.map((p) => p.id),
  );

  const positionsByPredictionId: Record<string, PositionSummary> = {};
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

  const exposure = openPositions.reduce((sum, p) => sum + p.stake, 0);
  const positionedPredictions = new Set(openPositions.map((p) => p.prediction_id)).size;

  return {
    predictions,
    account: { balance: account.balance },
    positionsByPredictionId,
    exposure,
    positionedPredictions,
    openPositionsCount: openPositions.length,
  };
}

export type PredictionDetailData = {
  prediction: PredictionRow;
  account: { balance: number };
  forecasts: Array<{ id: string; probability: number; note: string | null; created_at: string }>;
  positions: PaperPositionRow[];
  ledger: Array<{
    id: string;
    kind: string;
    delta: number;
    balance_after: number;
    memo: string | null;
    created_at: string;
  }>;
};

export async function getPredictionDetailData(userId: string, predictionId: string): Promise<PredictionDetailData | null> {
  const prediction = await getPrediction(userId, predictionId);
  if (!prediction) return null;

  const account = await ensurePaperAccount(userId);
  const forecasts = await listForecastsByPredictionId(userId, prediction.id, 25);
  const positions = await listPaperPositionsByPredictionId(userId, prediction.id, 50);
  const ledger = await listPaperLedger(userId, 15);

  return {
    prediction,
    account: { balance: account.balance },
    forecasts,
    positions,
    ledger,
  };
}
