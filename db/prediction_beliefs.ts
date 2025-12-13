import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export async function attach(
  userId: string,
  predictionId: string,
  beliefId: string,
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

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { error } = await supabase
    .from("prediction_beliefs")
    .upsert(
      { prediction_id: predictionId, belief_id: beliefId },
      { onConflict: "prediction_id,belief_id" },
    );

  if (error) throw error;
}

export async function detach(
  userId: string,
  predictionId: string,
  beliefId: string,
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

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { error } = await supabase
    .from("prediction_beliefs")
    .delete()
    .eq("prediction_id", predictionId)
    .eq("belief_id", beliefId);

  if (error) throw error;
}

