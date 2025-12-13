import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";

export type JournalEntryRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  entry_at: string;
  created_at: string;
  updated_at: string;
};

export type CreateJournalEntryInput = {
  title?: string | null;
  body: string;
  entry_at?: string;
};

export type UpdateJournalEntryInput = Partial<CreateJournalEntryInput>;

export async function list(
  userId: string,
  options?: { limit?: number },
): Promise<JournalEntryRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, title, body, entry_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("entry_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function countSince(
  userId: string,
  since: string,
): Promise<number> {
  const supabase = createSupabaseServerClient();

  const { count, error } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("entry_at", since);

  if (error) throw error;
  return count ?? 0;
}

export async function countAll(userId: string): Promise<number> {
  const supabase = createSupabaseServerClient();

  const { count, error } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function listRecent(
  userId: string,
  limit = 10,
): Promise<JournalEntryRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, title, body, entry_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function get(
  userId: string,
  journalEntryId: string,
): Promise<JournalEntryRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, title, body, entry_at, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", journalEntryId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(
  userId: string,
  input: CreateJournalEntryInput,
): Promise<JournalEntryRow> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      ...(input.title !== undefined ? { title: input.title } : {}),
      body: input.body,
      ...(input.entry_at ? { entry_at: input.entry_at } : {}),
    })
    .select("id, user_id, title, body, entry_at, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function update(
  userId: string,
  journalEntryId: string,
  patch: UpdateJournalEntryInput,
): Promise<JournalEntryRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.entry_at !== undefined ? { entry_at: patch.entry_at } : {}),
    })
    .eq("user_id", userId)
    .eq("id", journalEntryId)
    .select("id, user_id, title, body, entry_at, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteById(
  userId: string,
  journalEntryId: string,
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", journalEntryId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
