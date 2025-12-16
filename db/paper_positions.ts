import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PaperPositionSide = "yes" | "no";

export type PaperPositionRow = {
  id: string;
  user_id: string;
  prediction_id: string;
  side: PaperPositionSide;
  stake: number;
  line: number;
  opened_at: string;
  settled_at: string | null;
  outcome: "true" | "false" | "unknown" | null;
  payout: number | null;
  pnl: number | null;
  created_at: string;
  updated_at: string;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeRow(row: Record<string, unknown>): PaperPositionRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    prediction_id: String(row.prediction_id ?? ""),
    side: (row.side as PaperPositionSide) ?? "yes",
    stake: toNumber(row.stake),
    line: toNumber(row.line),
    opened_at: String(row.opened_at ?? ""),
    settled_at: (row.settled_at as string | null) ?? null,
    outcome: (row.outcome as PaperPositionRow["outcome"]) ?? null,
    payout: row.payout !== undefined && row.payout !== null ? toNumber(row.payout) : null,
    pnl: row.pnl !== undefined && row.pnl !== null ? toNumber(row.pnl) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listOpenByPredictionIds(
  userId: string,
  predictionIds: string[],
): Promise<PaperPositionRow[]> {
  if (predictionIds.length === 0) return [];
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("paper_positions")
    .select(
      "id, user_id, prediction_id, side, stake, line, opened_at, settled_at, outcome, payout, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("prediction_id", predictionIds)
    .is("settled_at", null)
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function listByPredictionId(
  userId: string,
  predictionId: string,
  limit = 50,
): Promise<PaperPositionRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("paper_positions")
    .select(
      "id, user_id, prediction_id, side, stake, line, opened_at, settled_at, outcome, payout, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .order("opened_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function createOpenPosition(input: {
  user_id: string;
  prediction_id: string;
  side: PaperPositionSide;
  stake: number;
  line: number;
}): Promise<PaperPositionRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("paper_positions")
    .insert({
      user_id: input.user_id,
      prediction_id: input.prediction_id,
      side: input.side,
      stake: input.stake,
      line: Math.round(input.line * 10_000) / 10_000,
      opened_at: new Date().toISOString(),
    })
    .select(
      "id, user_id, prediction_id, side, stake, line, opened_at, settled_at, outcome, payout, pnl, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function listOpenByPredictionId(
  userId: string,
  predictionId: string,
): Promise<PaperPositionRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("paper_positions")
    .select(
      "id, user_id, prediction_id, side, stake, line, opened_at, settled_at, outcome, payout, pnl, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .is("settled_at", null)
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function settleOpenPositionsForPrediction(input: {
  user_id: string;
  prediction_id: string;
  outcome: "true" | "false";
  settleAt?: string;
  compute: (position: PaperPositionRow) => { payout: number; pnl: number };
}): Promise<PaperPositionRow[]> {
  const open = await listOpenByPredictionId(input.user_id, input.prediction_id);
  if (open.length === 0) return [];

  const settledAt = input.settleAt ?? new Date().toISOString();
  const updates = open.map((p) => {
    const { payout, pnl } = input.compute(p);
    return {
      id: p.id,
      payout: Math.round(payout * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      settled_at: settledAt,
      outcome: input.outcome,
    };
  });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("paper_positions")
    .upsert(updates, { onConflict: "id" })
    .select(
      "id, user_id, prediction_id, side, stake, line, opened_at, settled_at, outcome, payout, pnl, created_at, updated_at",
    );

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

