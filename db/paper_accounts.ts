import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PaperAccountRow = {
  user_id: string;
  balance: number;
  starting_balance: number;
  created_at: string;
  updated_at: string;
};

const DEFAULT_STARTING_BALANCE = 1000;

import { toNumber } from "@/db/utils";

function normalizeRow(row: Record<string, unknown>): PaperAccountRow {
  return {
    user_id: String(row.user_id ?? ""),
    balance: toNumber(row.balance),
    starting_balance: toNumber(row.starting_balance),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function get(userId: string): Promise<PaperAccountRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("paper_accounts")
    .select("user_id, balance, starting_balance, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function ensure(userId: string): Promise<PaperAccountRow> {
  const existing = await get(userId);
  if (existing) return existing;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("paper_accounts")
    .insert({
      user_id: userId,
      balance: DEFAULT_STARTING_BALANCE,
      starting_balance: DEFAULT_STARTING_BALANCE,
    })
    .select("user_id, balance, starting_balance, created_at, updated_at")
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function updateBalance(
  userId: string,
  balance: number,
): Promise<PaperAccountRow> {
  const supabase = createSupabaseServerClient();
  const nextBalance = Math.max(0, Math.round(balance * 100) / 100);

  const { data, error } = await supabase
    .from("paper_accounts")
    .update({ balance: nextBalance })
    .eq("user_id", userId)
    .select("user_id, balance, starting_balance, created_at, updated_at")
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

