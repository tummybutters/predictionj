import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type {
  CreatePredictionInput,
  PredictionOutcome,
  PredictionRow,
  UpdatePredictionInput,
} from "@/db/predictions.types";

import type {
  CreatePredictionInput,
  PredictionRow,
  UpdatePredictionInput,
} from "@/db/predictions.types";

export async function listOpen(
  userId: string,
  options?: { limit?: number },
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("outcome", null)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
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
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .is("resolved_at", null)
    .is("outcome", null)
    .lte("resolution_date", toDate)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listRecentlyResolved(
  userId: string,
  limit = 10,
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .not("resolved_at", "is", null)
    .order("resolved_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function list(
  userId: string,
  options?: { limit?: number },
): Promise<PredictionRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("resolution_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function get(
  userId: string,
  predictionId: string,
): Promise<PredictionRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();

  if (error) throw error;
  return data;
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
      resolution_date: input.resolution_date,
    })
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data;
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
    .select(
      "id, user_id, claim, confidence, resolution_date, resolved_at, outcome, resolution_note, created_at, updated_at",
    )
    .maybeSingle();

  if (error) throw error;
  return data;
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
