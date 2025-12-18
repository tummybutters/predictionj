import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type BankrollRow = {
  user_id: string;
  balance: number;
  starting_balance: number;
  bust_count: number;
  all_time_high: number;
  last_bust_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_STARTING_BALANCE = 1000;

import { toNumber } from "@/db/utils";

function normalizeRow(row: Record<string, unknown>): BankrollRow {
  return {
    user_id: String(row.user_id ?? ""),
    balance: toNumber(row.balance),
    starting_balance: toNumber(row.starting_balance),
    bust_count: Number(row.bust_count ?? 0),
    all_time_high: toNumber(row.all_time_high),
    last_bust_at: (row.last_bust_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function get(userId: string): Promise<BankrollRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_bankroll")
    .select(
      "user_id, balance, starting_balance, bust_count, all_time_high, last_bust_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function ensure(userId: string): Promise<BankrollRow> {
  const supabase = createSupabaseServerClient();
  const existing = await get(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("user_bankroll")
    .insert({
      user_id: userId,
      balance: DEFAULT_STARTING_BALANCE,
      starting_balance: DEFAULT_STARTING_BALANCE,
      all_time_high: DEFAULT_STARTING_BALANCE,
      bust_count: 0,
    })
    .select(
      "user_id, balance, starting_balance, bust_count, all_time_high, last_bust_at, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function update(
  userId: string,
  patch: Partial<
    Pick<
      BankrollRow,
      | "balance"
      | "starting_balance"
      | "bust_count"
      | "all_time_high"
      | "last_bust_at"
    >
  >,
): Promise<BankrollRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_bankroll")
    .update(patch)
    .eq("user_id", userId)
    .select(
      "user_id, balance, starting_balance, bust_count, all_time_high, last_bust_at, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

