import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";
import { normalizeHandle, randomSuffix, withShortSuffix } from "@/lib/handles";

export type TruthObjectType = "note" | "belief" | "prediction" | "framework" | "data";

export type TruthObjectRow = {
  id: string;
  user_id: string;
  type: TruthObjectType;
  handle: string;
  title: string;
  body: string;
  confidence: number | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateTruthObjectInput = {
  type: TruthObjectType;
  handle: string;
  title?: string;
  body?: string;
  confidence?: number | null;
  source_url?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateTruthObjectInput = Partial<
  Omit<CreateTruthObjectInput, "type"> & { type: TruthObjectType }
>;

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return anyErr.code === "23505" || (anyErr.message ?? "").toLowerCase().includes("duplicate");
}

export async function listByType(
  userId: string,
  type: TruthObjectType,
  options?: { limit?: number },
): Promise<TruthObjectRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 100;

  const { data, error } = await supabase
    .from("truth_objects")
    .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TruthObjectRow[];
}

export async function listRecent(
  userId: string,
  options?: { limit?: number; types?: TruthObjectType[] },
): Promise<TruthObjectRow[]> {
  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 200;

  let query = supabase
    .from("truth_objects")
    .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (options?.types?.length) {
    query = query.in("type", options.types as unknown as string[]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TruthObjectRow[];
}

export async function countByType(userId: string): Promise<Record<TruthObjectType, number>> {
  const supabase = createSupabaseServerClient();
  const types: TruthObjectType[] = ["note", "belief", "prediction", "framework", "data"];

  const counts = await Promise.all(
    types.map(async (type) => {
      const { count, error } = await supabase
        .from("truth_objects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", type);
      if (error) throw error;
      return [type, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(counts) as Record<TruthObjectType, number>;
}

export async function getById(userId: string, id: string): Promise<TruthObjectRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("truth_objects")
    .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TruthObjectRow | null;
}

export async function getByHandle(
  userId: string,
  handle: string,
): Promise<TruthObjectRow | null> {
  const supabase = createSupabaseServerClient();

  const normalized = normalizeHandle(handle);
  const { data, error } = await supabase
    .from("truth_objects")
    .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
    .eq("user_id", userId)
    .eq("handle", normalized)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TruthObjectRow | null;
}

export async function create(
  userId: string,
  input: CreateTruthObjectInput,
): Promise<TruthObjectRow> {
  const supabase = createSupabaseServerClient();

  const baseHandle = normalizeHandle(input.handle);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const handle =
      attempt === 0 ? baseHandle : withShortSuffix(baseHandle, `${randomSuffix()}${attempt}`);

    const { data, error } = await supabase
      .from("truth_objects")
      .insert({
        user_id: userId,
        type: input.type,
        handle,
        title: input.title ?? "",
        body: input.body ?? "",
        confidence: input.confidence ?? null,
        source_url: input.source_url ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
      .single();

    if (!error) return data as TruthObjectRow;
    if (isUniqueViolation(error) && attempt < 5) continue;
    throw error;
  }

  throw new Error("Failed to create object: handle conflicts.");
}

export async function update(
  userId: string,
  id: string,
  patch: UpdateTruthObjectInput,
): Promise<TruthObjectRow | null> {
  const supabase = createSupabaseServerClient();

  const next: Record<string, unknown> = {};
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.handle !== undefined) next.handle = normalizeHandle(patch.handle);
  if (patch.title !== undefined) next.title = patch.title ?? "";
  if (patch.body !== undefined) next.body = patch.body ?? "";
  if (patch.confidence !== undefined) next.confidence = patch.confidence;
  if (patch.source_url !== undefined) next.source_url = patch.source_url;
  if (patch.metadata !== undefined) next.metadata = patch.metadata ?? {};

  const { data, error } = await supabase
    .from("truth_objects")
    .update(next)
    .eq("user_id", userId)
    .eq("id", id)
    .select("id, user_id, type, handle, title, body, confidence, source_url, metadata, created_at, updated_at")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TruthObjectRow | null;
}

export async function deleteById(userId: string, id: string): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("truth_objects")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as { id: string } | null;
}
