import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export async function attach(
  userId: string,
  predictionId: string,
  tagId: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: prediction, error: predErr } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();
  if (predErr) throw predErr;
  if (!prediction) return;

  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("id", tagId)
    .maybeSingle();
  if (tagErr) throw tagErr;
  if (!tag) return;

  const { error } = await supabase
    .from("prediction_tags")
    .upsert(
      { prediction_id: predictionId, tag_id: tagId },
      { onConflict: "prediction_id,tag_id" },
    );
  if (error) throw error;
}

export async function detach(
  userId: string,
  predictionId: string,
  tagId: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: prediction, error: predErr } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();
  if (predErr) throw predErr;
  if (!prediction) return;

  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("id", tagId)
    .maybeSingle();
  if (tagErr) throw tagErr;
  if (!tag) return;

  const { error } = await supabase
    .from("prediction_tags")
    .delete()
    .eq("prediction_id", predictionId)
    .eq("tag_id", tagId);
  if (error) throw error;
}

