import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export async function attach(
  userId: string,
  journalEntryId: string,
  beliefId: string,
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

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { error } = await supabase
    .from("journal_entry_beliefs")
    .upsert(
      { journal_entry_id: journalEntryId, belief_id: beliefId },
      { onConflict: "journal_entry_id,belief_id" },
    );

  if (error) throw error;
}

export async function detach(
  userId: string,
  journalEntryId: string,
  beliefId: string,
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

  const { data: belief, error: beliefErr } = await supabase
    .from("beliefs")
    .select("id")
    .eq("user_id", userId)
    .eq("id", beliefId)
    .maybeSingle();
  if (beliefErr) throw beliefErr;
  if (!belief) return;

  const { error } = await supabase
    .from("journal_entry_beliefs")
    .delete()
    .eq("journal_entry_id", journalEntryId)
    .eq("belief_id", beliefId);

  if (error) throw error;
}

