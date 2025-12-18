"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { createEntry, deleteEntry, updateEntry } from "@/services/journal";
import {
  journalEntryCreateSchema,
  journalEntryDeleteSchema,
  journalEntryUpdateSchema,
} from "@/lib/validation/journal";
import { deriveTitle } from "@/lib/journal";

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

export async function createJournalEntryAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = journalEntryCreateSchema.safeParse({
    title: getString(formData, "title"),
    body: getString(formData, "body"),
  });

  if (!parsed.success) {
    redirect("/journal?error=validation");
  }

  const body = parsed.data.body ?? "";
  const title = parsed.data.title ?? deriveTitle(body);
  const row = await createEntry(ensured.user_id, { title, body });

  revalidatePath("/journal");
  redirect(`/journal/${row.id}`);
}

export async function updateJournalEntryAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = journalEntryUpdateSchema.safeParse({
    id: getString(formData, "id"),
    title: getString(formData, "title"),
    body: getString(formData, "body"),
  });

  if (!parsed.success) {
    redirect("/journal?error=validation");
  }

  const body = parsed.data.body ?? "";
  const title = parsed.data.title ?? deriveTitle(body);

  const updated = await updateEntry(ensured.user_id, parsed.data.id, {
    title,
    body,
  });

  if (!updated) redirect("/journal");

  revalidatePath("/journal");
  revalidatePath(`/journal/${parsed.data.id}`);
  redirect(`/journal/${parsed.data.id}`);
}

export async function deleteJournalEntryAction(formData: FormData) {
  const ensured = await ensureUser();

  const parsed = journalEntryDeleteSchema.safeParse({
    id: getString(formData, "id"),
  });

  if (!parsed.success) {
    redirect("/journal?error=validation");
  }

  await deleteEntry(ensured.user_id, parsed.data.id);

  revalidatePath("/journal");
  redirect("/journal");
}

export async function createBlankJournalEntryAction() {
  const ensured = await ensureUser();
  const row = await createEntry(ensured.user_id, { title: null, body: "" });
  revalidatePath("/journal");
  redirect(`/journal/${row.id}`);
}

export async function saveJournalEntryDraftAction(input: { id: string; body: string }): Promise<{
  updated_at: string;
  title: string | null;
}> {
  const ensured = await ensureUser();

  const parsed = journalEntryUpdateSchema.safeParse({ id: input.id, body: input.body });
  if (!parsed.success) throw new Error("Invalid input.");

  const body = parsed.data.body ?? "";
  const title = deriveTitle(body);

  const updated = await updateEntry(ensured.user_id, parsed.data.id, { title, body });
  if (!updated) throw new Error("Not found.");

  revalidatePath("/journal");
  revalidatePath(`/journal/${parsed.data.id}`);
  return { updated_at: updated.updated_at, title: updated.title };
}
