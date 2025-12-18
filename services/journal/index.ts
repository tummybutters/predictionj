import "server-only";

import {
  create as createJournalEntry,
  deleteById as deleteJournalEntryById,
  get as getJournalEntry,
  list as listJournalEntries,
  update as updateJournalEntry,
  type JournalEntryRow,
} from "@/db/journal_entries";

export type EntryLite = Pick<JournalEntryRow, "id" | "title" | "body" | "entry_at" | "updated_at">;

export async function listEntries(userId: string, options?: { limit?: number }): Promise<JournalEntryRow[]> {
  return listJournalEntries(userId, options);
}

export async function getEntry(userId: string, entryId: string): Promise<JournalEntryRow | null> {
  return getJournalEntry(userId, entryId);
}

export async function createEntry(userId: string, input: { title?: string | null; body: string; entry_at?: string }): Promise<JournalEntryRow> {
  return createJournalEntry(userId, input);
}

export async function updateEntry(userId: string, entryId: string, patch: { title?: string | null; body?: string; entry_at?: string }): Promise<JournalEntryRow | null> {
  return updateJournalEntry(userId, entryId, patch);
}

export async function deleteEntry(userId: string, entryId: string): Promise<{ id: string } | null> {
  return deleteJournalEntryById(userId, entryId);
}

