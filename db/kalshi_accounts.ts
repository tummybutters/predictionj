import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type KalshiAccountRow = {
  user_id: string;
  key_id: string;
  rsa_private_key: string | null;
  rsa_private_key_enc: string | null;
  created_at: string;
  updated_at: string;
};

export const KALSHI_ACCOUNT_COLUMNS =
  "user_id, key_id, rsa_private_key, rsa_private_key_enc, created_at, updated_at" as const;

function normalizeRow(row: Record<string, unknown>): KalshiAccountRow {
  return {
    user_id: String(row.user_id ?? ""),
    key_id: String(row.key_id ?? ""),
    rsa_private_key: row.rsa_private_key === null ? null : String(row.rsa_private_key ?? ""),
    rsa_private_key_enc:
      row.rsa_private_key_enc === null ? null : String(row.rsa_private_key_enc ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getKalshiAccount(userId: string): Promise<KalshiAccountRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kalshi_accounts")
    .select(KALSHI_ACCOUNT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function saveKalshiAccount(
  account: Omit<KalshiAccountRow, "created_at" | "updated_at">,
): Promise<KalshiAccountRow> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("kalshi_accounts")
    .upsert(account, { onConflict: "user_id" })
    .select(KALSHI_ACCOUNT_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function deleteKalshiAccount(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("kalshi_accounts").delete().eq("user_id", userId);

  if (error) throw error;
}
