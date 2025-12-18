import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";
import { toNumber } from "@/db/utils";

export type PredictionOutcome = "true" | "false" | "unknown";

export type PredictionRow = {
  id: string;
  user_id: string;
  claim: string;
  confidence: number;
  reference_line: number;
  resolution_date: string;
  resolved_at: string | null;
  outcome: PredictionOutcome | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export const PREDICTION_COLUMNS =
  "id, user_id, claim, confidence, reference_line, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at" as const;

function normalizeRow(row: Record<string, unknown>): PredictionRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    claim: String(row.claim ?? ""),
    confidence: toNumber(row.confidence),
    reference_line: toNumber(row.reference_line),
    resolution_date: String(row.resolution_date ?? ""),
    resolved_at: (row.resolved_at as string | null) ?? null,
    outcome: (row.outcome as PredictionOutcome | null) ?? null,
    resolution_note: (row.resolution_note as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export type CreatePredictionInput = {
  claim: string;
  confidence: number;
  reference_line?: number;
  resolution_date: string;
};

export type UpdatePredictionInput = Partial<CreatePredictionInput> & {
  resolved_at?: string | null;
  outcome?: PredictionOutcome | null;
  resolution_note?: string | null;
};

export async function listOpen(
  userId: string,
  options?: { limit?: number },
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_COLUMNS)
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("outcome", null)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function countByStatus(userId: string): Promise<{
  open: number;
  resolved: number;
}> {
  const supabase = createSupabaseServerClient();

  const [{ count: openCount, error: openErr }, { count: resolvedCount, error: resolvedErr }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("resolved_at", null)
        .is("outcome", null),
      supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("resolved_at", "is", null),
    ]);

  if (openErr) throw openErr;
  if (resolvedErr) throw resolvedErr;

  return { open: openCount ?? 0, resolved: resolvedCount ?? 0 };
}

export async function listDueSoon(
  userId: string,
  toDate: string,
  limit = 10,
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_COLUMNS)
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("outcome", null)
    .lte("resolution_date", toDate)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function listRecentlyResolved(
  userId: string,
  limit = 10,
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_COLUMNS)
    .eq("user_id", userId)
    .not("resolved_at", "is", null)
    .order("resolved_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function list(
  userId: string,
  options?: { limit?: number },
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_COLUMNS)
    .eq("user_id", userId)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}

export async function get(
  userId: string,
  predictionId: string,
): Promise<PredictionRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_COLUMNS)
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function create(
  userId: string,
  input: CreatePredictionInput,
): Promise<PredictionRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .insert({
      user_id: userId,
      claim: input.claim,
      confidence: input.confidence,
      reference_line: input.reference_line ?? 0.5,
      resolution_date: input.resolution_date,
    })
    .select(PREDICTION_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function update(
  userId: string,
  predictionId: string,
  patch: UpdatePredictionInput,
): Promise<PredictionRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .update({
      ...(patch.claim !== undefined ? { claim: patch.claim } : {}),
      ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
      ...(patch.reference_line !== undefined
        ? { reference_line: patch.reference_line }
        : {}),
      ...(patch.resolution_date !== undefined
        ? { resolution_date: patch.resolution_date }
        : {}),
      ...(patch.resolved_at !== undefined ? { resolved_at: patch.resolved_at } : {}),
      ...(patch.outcome !== undefined ? { outcome: patch.outcome } : {}),
      ...(patch.resolution_note !== undefined
        ? { resolution_note: patch.resolution_note }
        : {}),
    })
    .eq("user_id", userId)
    .eq("id", predictionId)
    .select(PREDICTION_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function deleteById(
  userId: string,
  predictionId: string,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("id", predictionId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
