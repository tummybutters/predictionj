import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type UserRow = {
  id: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
};

export async function getByClerkId(clerkUserId: string): Promise<UserRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_user_id, created_at, updated_at")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createIfMissing(
  clerkUserId: string,
): Promise<Pick<UserRow, "id" | "clerk_user_id">> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .upsert({ clerk_user_id: clerkUserId }, { onConflict: "clerk_user_id" })
    .select("id, clerk_user_id")
    .single();

  if (error) throw error;
  return data;
}

// Optional snake_case aliases for searchability.
export const get_by_clerk_id = getByClerkId;
export const create_if_missing = createIfMissing;
