import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PredictionForecastRow = {
  id: string;
  user_id: string;
  prediction_id: string;
  probability: number;
  note: string | null;
  created_at: string;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeRow(row: Record<string, unknown>): PredictionForecastRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    prediction_id: String(row.prediction_id ?? ""),
    probability: toNumber(row.probability),
    note: (row.note as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function listByPredictionId(
  userId: string,
  predictionId: string,
  limit = 50,
): Promise<PredictionForecastRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_forecasts")
    .select("id, user_id, prediction_id, probability, note, created_at")
    .eq("user_id", userId)
    .eq("prediction_id", predictionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function createForecast(input: {
  user_id: string;
  prediction_id: string;
  probability: number;
  note?: string | null;
}): Promise<PredictionForecastRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("prediction_forecasts")
    .insert({
      user_id: input.user_id,
      prediction_id: input.prediction_id,
      probability: Math.round(input.probability * 10_000) / 10_000,
      note: input.note ?? null,
    })
    .select("id, user_id, prediction_id, probability, note, created_at")
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

