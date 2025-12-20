import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type TruthObjectLinkRelation =
  | "supports"
  | "contradicts"
  | "derived_from"
  | "uses"
  | "related";

export type TruthObjectLinkRow = {
  id: string;
  user_id: string;
  from_object_id: string;
  to_object_id: string;
  relation: TruthObjectLinkRelation;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function listForObject(
  userId: string,
  objectId: string,
): Promise<TruthObjectLinkRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("truth_object_links")
    .select("id, user_id, from_object_id, to_object_id, relation, note, created_at, updated_at")
    .eq("user_id", userId)
    .or(`from_object_id.eq.${objectId},to_object_id.eq.${objectId}`)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as TruthObjectLinkRow[];
}

export async function create(
  userId: string,
  input: {
    from_object_id: string;
    to_object_id: string;
    relation: TruthObjectLinkRelation;
    note?: string | null;
  },
): Promise<TruthObjectLinkRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("truth_object_links")
    .insert({
      user_id: userId,
      from_object_id: input.from_object_id,
      to_object_id: input.to_object_id,
      relation: input.relation,
      note: input.note ?? null,
    })
    .select("id, user_id, from_object_id, to_object_id, relation, note, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as TruthObjectLinkRow;
}

export async function deleteById(userId: string, id: string): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("truth_object_links")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as { id: string } | null;
}

