import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type TagRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CreateTagInput = {
  name: string;
};

export type UpdateTagInput = Partial<CreateTagInput>;

export async function list(
  userId: string,
  options?: { limit?: number },
): Promise<TagRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 100;

  const { data, error } = await supabase
    .from("tags")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function get(userId: string, tagId: string): Promise<TagRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tags")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", tagId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(userId: string, input: CreateTagInput): Promise<TagRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name: input.name })
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  userId: string,
  tagId: string,
  patch: UpdateTagInput,
): Promise<TagRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tags")
    .update({ ...(patch.name !== undefined ? { name: patch.name } : {}) })
    .eq("user_id", userId)
    .eq("id", tagId)
    .select("id, user_id, name, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteById(
  userId: string,
  tagId: string,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tags")
    .delete()
    .eq("user_id", userId)
    .eq("id", tagId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
