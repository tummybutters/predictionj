import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PredictionBetRow = {
  id: string;
  user_id: string;
  prediction_id: string;
  stake: number;
  confidence: number;
  placed_at: string;
  settled_at: string | null;
  outcome: "true" | "false" | "unknown" | null;
  pnl: number | null;
  created_at: string;
  updated_at: string;
};

export type OpenPredictionStakeRow = {
  prediction_id: string;
  stake: number;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeRow(row: Record<string, unknown>): PredictionBetRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    prediction_id: String(row.prediction_id ?? ""),
    stake: toNumber(row.stake),
    confidence: toNumber(row.confidence),
    placed_at: String(row.placed_at ?? ""),
    settled_at: (row.settled_at as string | null) ?? null,
    outcome: (row.outcome as PredictionBetRow["outcome"]) ?? null,
    pnl: row.pnl !== undefined && row.pnl !== null ? toNumber(row.pnl) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeOpenStakeRow(row: Record<string, unknown>): OpenPredictionStakeRow {
  return {
    prediction_id: String(row.prediction_id ?? ""),
    stake: toNumber(row.stake),
  };
}

export async function getOpenByPredictionId(
  userId: string,
  predictionId: string,
): Promise<PredictionBetRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prediction_bets")
    .select(
      "id, user_id, prediction_id, stake, confidence, placed_at, settled_at, outcome, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .is("settled_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function listOpenStakes(
  userId: string,
): Promise<OpenPredictionStakeRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_bets")
    .select("prediction_id, stake")
    .eq("user_id", userId)
    .is("settled_at", null);

  if (error) throw error;
  return (data ?? []).map(normalizeOpenStakeRow);
}

export async function getByPredictionId(
  userId: string,
  predictionId: string,
): Promise<PredictionBetRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prediction_bets")
    .select(
      "id, user_id, prediction_id, stake, confidence, placed_at, settled_at, outcome, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function listOpenByPredictionIds(
  userId: string,
  predictionIds: string[],
): Promise<PredictionBetRow[]> {
  if (predictionIds.length === 0) return [];
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_bets")
    .select(
      "id, user_id, prediction_id, stake, confidence, placed_at, settled_at, outcome, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("prediction_id", predictionIds)
    .is("settled_at", null)
    .order("placed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function upsertOpenBet(
  userId: string,
  predictionId: string,
  input: { stake: number; confidence: number },
): Promise<PredictionBetRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_bets")
    .upsert(
      {
        user_id: userId,
        prediction_id: predictionId,
        stake: input.stake,
        confidence: input.confidence,
        placed_at: new Date().toISOString(),
        settled_at: null,
        outcome: null,
        pnl: null,
      },
      { onConflict: "user_id,prediction_id" },
    )
    .select(
      "id, user_id, prediction_id, stake, confidence, placed_at, settled_at, outcome, pnl, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function deleteOpenBet(
  userId: string,
  predictionId: string,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prediction_bets")
    .delete()
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .is("settled_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function settleOpenBet(
  userId: string,
  predictionId: string,
  input: { outcome: "true" | "false" | "unknown"; pnl: number },
): Promise<PredictionBetRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_bets")
    .update({
      settled_at: new Date().toISOString(),
      outcome: input.outcome,
      pnl: input.pnl,
    })
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .is("settled_at", null)
    .select(
      "id, user_id, prediction_id, stake, confidence, placed_at, settled_at, outcome, pnl, created_at, updated_at",
    )
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data) : null;
}
