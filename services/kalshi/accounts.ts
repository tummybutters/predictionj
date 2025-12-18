import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type KalshiAccount = {
    user_id: string;
    key_id: string;
    rsa_private_key: string;
    created_at: string;
    updated_at: string;
};

export async function getKalshiAccount(userId: string): Promise<KalshiAccount | null> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("kalshi_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    return data as KalshiAccount | null;
}

export async function saveKalshiAccount(account: Omit<KalshiAccount, "created_at" | "updated_at">): Promise<KalshiAccount> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("kalshi_accounts")
        .upsert(account, { onConflict: "user_id" })
        .select("*")
        .single();

    if (error) throw error;
    return data as KalshiAccount;
}

export async function deleteKalshiAccount(userId: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
        .from("kalshi_accounts")
        .delete()
        .eq("user_id", userId);

    if (error) throw error;
}
