import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type BankrollTransactionRow = {
  id: string;
  user_id: string;
  prediction_id: string | null;
  kind: string;
  delta: number;
  balance_after: number;
  memo: string | null;
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

function normalizeRow(row: Record<string, unknown>): BankrollTransactionRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    prediction_id: (row.prediction_id as string | null) ?? null,
    kind: String(row.kind ?? ""),
    delta: toNumber(row.delta),
    balance_after: toNumber(row.balance_after),
    memo: (row.memo as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function createTransaction(input: {
  user_id: string;
  prediction_id?: string | null;
  kind: string;
  delta: number;
  balance_after: number;
  memo?: string | null;
}): Promise<BankrollTransactionRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bankroll_transactions")
    .insert({
      user_id: input.user_id,
      prediction_id: input.prediction_id ?? null,
      kind: input.kind,
      delta: input.delta,
      balance_after: input.balance_after,
      memo: input.memo ?? null,
    })
    .select("id, user_id, prediction_id, kind, delta, balance_after, memo, created_at")
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function listRecent(
  userId: string,
  limit = 20,
): Promise<BankrollTransactionRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bankroll_transactions")
    .select("id, user_id, prediction_id, kind, delta, balance_after, memo, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(normalizeRow);
}
