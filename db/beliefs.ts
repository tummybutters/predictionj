import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type BeliefRow = {
  id: string;
  user_id: string;
  statement: string;
  is_foundational: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateBeliefInput = {
  statement: string;
  is_foundational?: boolean;
};

export type UpdateBeliefInput = Partial<CreateBeliefInput>;

export async function list(
  userId: string,
  options?: { limit?: number },
): Promise<BeliefRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("beliefs")
    .select("id, user_id, statement, is_foundational, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function get(
  userId: string,
  beliefId: string,
): Promise<BeliefRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("beliefs")
    .select("id, user_id, statement, is_foundational, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  userId: string,
  input: CreateBeliefInput,
): Promise<BeliefRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("beliefs")
    .insert({
      user_id: userId,
      statement: input.statement,
      ...(input.is_foundational !== undefined
        ? { is_foundational: input.is_foundational }
        : {}),
    })
    .select("id, user_id, statement, is_foundational, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  userId: string,
  beliefId: string,
  patch: UpdateBeliefInput,
): Promise<BeliefRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("beliefs")
    .update({
      ...(patch.statement !== undefined ? { statement: patch.statement } : {}),
      ...(patch.is_foundational !== undefined
        ? { is_foundational: patch.is_foundational }
        : {}),
    })
    .eq("user_id", userId)
    .eq("id", beliefId)
    .select("id, user_id, statement, is_foundational, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteById(
  userId: string,
  beliefId: string,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("beliefs")
    .delete()
    .eq("user_id", userId)
    .eq("id", beliefId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
