import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export async function attach(userId: string, beliefId: string, tagId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("id", tagId)
    .maybeSingle();
  if (tagErr) throw tagErr;
  if (!tag) return;

  const { error } = await supabase
    .from("belief_tags")
    .upsert({ belief_id: beliefId, tag_id: tagId }, { onConflict: "belief_id,tag_id" });
  if (error) throw error;
}

export async function detach(userId: string, beliefId: string, tagId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("id", tagId)
    .maybeSingle();
  if (tagErr) throw tagErr;
  if (!tag) return;

  const { error } = await supabase
    .from("belief_tags")
    .delete()
    .eq("belief_id", beliefId)
    .eq("tag_id", tagId);
  if (error) throw error;
}

