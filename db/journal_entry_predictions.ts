import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export async function attach(
  userId: string,
  journalEntryId: string,
  predictionId: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: journalEntry, error: journalErr } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("id", journalEntryId)
    .maybeSingle();
  if (journalErr) throw journalErr;
  if (!journalEntry) return;

  const { data: prediction, error: predErr } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();
  if (predErr) throw predErr;
  if (!prediction) return;

  const { error } = await supabase
    .from("journal_entry_predictions")
    .upsert(
      { journal_entry_id: journalEntryId, prediction_id: predictionId },
      { onConflict: "journal_entry_id,prediction_id" },
    );

  if (error) throw error;
}

export async function detach(
  userId: string,
  journalEntryId: string,
  predictionId: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: journalEntry, error: journalErr } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("id", journalEntryId)
    .maybeSingle();
  if (journalErr) throw journalErr;
  if (!journalEntry) return;

  const { data: prediction, error: predErr } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", userId)
    .eq("id", predictionId)
    .maybeSingle();
  if (predErr) throw predErr;
  if (!prediction) return;

  const { error } = await supabase
    .from("journal_entry_predictions")
    .delete()
    .eq("journal_entry_id", journalEntryId)
    .eq("prediction_id", predictionId);

  if (error) throw error;
}

