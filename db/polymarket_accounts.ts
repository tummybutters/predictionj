import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PolymarketAccountRow = {
  user_id: string;
  poly_address: string;
  api_key: string;
  api_secret: string;
  api_passphrase: string;
  proxy_address: string | null;
  signature_type: number;
  private_key_enc: string | null;
  created_at: string;
  updated_at: string;
};

export const POLYMARKET_ACCOUNT_COLUMNS =
  "user_id, poly_address, api_key, api_secret, api_passphrase, proxy_address, signature_type, private_key_enc, created_at, updated_at" as const;

function normalizeRow(row: Record<string, unknown>): PolymarketAccountRow {
  return {
    user_id: String(row.user_id ?? ""),
    poly_address: String(row.poly_address ?? ""),
    api_key: String(row.api_key ?? ""),
    api_secret: String(row.api_secret ?? ""),
    api_passphrase: String(row.api_passphrase ?? ""),
    proxy_address: (row.proxy_address as string | null) ?? null,
    signature_type: Number(row.signature_type ?? 0),
    private_key_enc: (row.private_key_enc as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getPolymarketAccount(userId: string): Promise<PolymarketAccountRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("polymarket_accounts")
    .select(POLYMARKET_ACCOUNT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

export async function savePolymarketAccount(
  account: Omit<PolymarketAccountRow, "created_at" | "updated_at">,
): Promise<PolymarketAccountRow> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("polymarket_accounts")
    .upsert(account, { onConflict: "user_id" })
    .select(POLYMARKET_ACCOUNT_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeRow(data);
}

export async function deletePolymarketAccount(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("polymarket_accounts").delete().eq("user_id", userId);

  if (error) throw error;
}
