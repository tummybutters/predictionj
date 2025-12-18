import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type PolymarketAccount = {
    user_id: string;
    poly_address: string;
    api_key: string;
    api_secret: string;
    api_passphrase: string;
    proxy_address: string | null;
    signature_type: number;
    created_at: string;
    updated_at: string;
};

export async function getPolymarketAccount(userId: string): Promise<PolymarketAccount | null> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("polymarket_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    return data as PolymarketAccount | null;
}

export async function savePolymarketAccount(account: Omit<PolymarketAccount, "created_at" | "updated_at">): Promise<PolymarketAccount> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("polymarket_accounts")
        .upsert(account, { onConflict: "user_id" })
        .select("*")
        .single();

    if (error) throw error;
    return data as PolymarketAccount;
}

export async function deletePolymarketAccount(userId: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
        .from("polymarket_accounts")
        .delete()
        .eq("user_id", userId);

    if (error) throw error;
}
