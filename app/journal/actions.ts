"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { create, deleteById, update } from "@/db/journal_entries";
import { ensureUser } from "@/services/auth/ensure-user";
import {
  journalEntryCreateSchema,
  journalEntryDeleteSchema,
  journalEntryUpdateSchema,
} from "@/lib/validation/journal";

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

  const row = await create(ensured.user_id, parsed.data);

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

  const updated = await update(ensured.user_id, parsed.data.id, {
    title: parsed.data.title,
    body: parsed.data.body,
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

  await deleteById(ensured.user_id, parsed.data.id);

  revalidatePath("/journal");
  redirect("/journal");
}

