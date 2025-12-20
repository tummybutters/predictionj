"use server";

import { ensureUser } from "@/services/auth/ensure-user";
import type { TruthObjectType } from "@/db/truth_objects";
import { create, update } from "@/db/truth_objects";
import { normalizeHandle } from "@/lib/handles";

function assertTruthObjectType(v: string): asserts v is TruthObjectType {
  const allowed: TruthObjectType[] = ["note", "belief", "prediction", "framework", "data"];
  if (!allowed.includes(v as TruthObjectType)) {
    throw new Error("Invalid type.");
  }
}

export async function createTruthObjectAction(input: {
  type: string;
  title?: string;
  body?: string;
  confidence?: number | null;
  source_url?: string | null;
  metadata?: Record<string, unknown>;
  handle?: string;
}): Promise<{ id: string; handle: string }> {
  assertTruthObjectType(input.type);
  const ensured = await ensureUser();

  const base =
    (input.handle ?? "").trim() ||
    (input.title ?? "").trim() ||
    (typeof input.metadata?.statement === "string" ? (input.metadata.statement as string) : "") ||
    input.type;

  const row = await create(ensured.user_id, {
    type: input.type,
    handle: normalizeHandle(base),
    title: input.title ?? "",
    body: input.body ?? "",
    confidence: input.confidence ?? null,
    source_url: input.source_url ?? null,
    metadata: input.metadata ?? {},
  });

  return { id: row.id, handle: row.handle };
}

export async function updateTruthObjectAction(input: {
  id: string;
  patch: {
    type?: string;
    handle?: string;
    title?: string;
    body?: string;
    confidence?: number | null;
    source_url?: string | null;
    metadata?: Record<string, unknown>;
  };
}): Promise<{ id: string; updated_at: string }> {
  const ensured = await ensureUser();

  let type: TruthObjectType | undefined = undefined;
  if (input.patch.type !== undefined) {
    assertTruthObjectType(input.patch.type);
    type = input.patch.type;
  }

  const row = await update(ensured.user_id, input.id, {
    ...(type !== undefined ? { type } : {}),
    ...(input.patch.handle !== undefined ? { handle: input.patch.handle } : {}),
    ...(input.patch.title !== undefined ? { title: input.patch.title } : {}),
    ...(input.patch.body !== undefined ? { body: input.patch.body } : {}),
    ...(input.patch.confidence !== undefined ? { confidence: input.patch.confidence } : {}),
    ...(input.patch.source_url !== undefined ? { source_url: input.patch.source_url } : {}),
    ...(input.patch.metadata !== undefined ? { metadata: input.patch.metadata } : {}),
  });

  if (!row) throw new Error("Not found.");
  return { id: row.id, updated_at: row.updated_at };
}

