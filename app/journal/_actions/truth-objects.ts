"use server";

import { ensureUser } from "@/services/auth/ensure-user";
import type { TruthObjectType, TruthObjectRow } from "@/db/truth_objects";
import { create, getByHandle, getById, update } from "@/db/truth_objects";
import { normalizeHandle, normalizeShortHandle, randomSuffix, withShortSuffix } from "@/lib/handles";

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

type HandleSuggestionInput = {
  id: string;
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return anyErr.code === "23505" || (anyErr.message ?? "").toLowerCase().includes("duplicate");
}

function pickHandleSeed(obj: TruthObjectRow): string {
  const meta = obj.metadata ?? {};
  const statement =
    typeof (meta as Record<string, unknown>).statement === "string"
      ? String((meta as Record<string, unknown>).statement)
      : "";
  const market = (meta as Record<string, unknown>).market;
  const question =
    market && typeof market === "object" && typeof (market as Record<string, unknown>).question === "string"
      ? String((market as Record<string, unknown>).question)
      : "";

  const title = (obj.title ?? "").trim();
  const body = (obj.body ?? "").replace(/\s+/g, " ").trim();

  return statement || question || title || body || obj.type;
}

async function generateHandleWithGemini(input: {
  type: TruthObjectType;
  seed: string;
}): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const seed = input.seed.slice(0, 240);
  const prompt = [
    "Return ONE short unique handle.",
    "Rules: lowercase letters/numbers only, 2-7 chars, no hyphens, no spaces, no prefix.",
    `Type: ${input.type}`,
    `Title+Question: ${seed}`,
  ].join("\n");

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 12,
      topK: 1,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    | null;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  if (!text) return null;
  const raw = text.replace(/^@/, "").trim().split(/\s+/)[0] ?? "";
  return raw || null;
}

async function generateHandleWithOpenAI(input: {
  type: TruthObjectType;
  seed: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.HANDLE_AI_MODEL ?? "gpt-5-nano";
  const seed = input.seed.slice(0, 240);
  const prompt = [
    "Return ONE short unique handle.",
    "Rules: lowercase letters/numbers only, 2-7 chars, no hyphens, no spaces, no prefix.",
    `Type: ${input.type}`,
    `Title+Question: ${seed}`,
  ].join("\n");

  const payload = {
    model,
    input: prompt,
    max_output_tokens: 12,
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as
    | {
        output_text?: string;
        output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      }
    | null;

  const outputText = typeof data?.output_text === "string" ? data.output_text : null;
  if (outputText) return outputText.trim() || null;

  const blocks = Array.isArray(data?.output) ? data?.output : [];
  for (const block of blocks) {
    const parts = Array.isArray(block.content) ? block.content : [];
    for (const part of parts) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        const text = part.text.trim();
        if (text) return text;
      }
    }
  }

  return null;
}

async function generateHandle(input: { type: TruthObjectType; seed: string }): Promise<string | null> {
  const provider = (process.env.HANDLE_AI_PROVIDER ?? "openai").toLowerCase();

  if (provider === "openai") {
    const result = await generateHandleWithOpenAI(input);
    if (result) return result;
  }

  if (provider === "gemini") {
    return generateHandleWithGemini(input);
  }

  // Fallback to Gemini if OpenAI not available.
  return generateHandleWithGemini(input);
}

async function ensureUniqueHandle(input: {
  userId: string;
  objectId: string;
  handle: string;
}): Promise<string> {
  let handle = normalizeHandle(input.handle);
  if (!handle) handle = "obj";

  const existing = await getByHandle(input.userId, handle);
  if (!existing || existing.id === input.objectId) return handle;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = withShortSuffix(handle, randomSuffix());
    const hit = await getByHandle(input.userId, candidate);
    if (!hit) return candidate;
  }
  return withShortSuffix(handle, randomSuffix());
}

async function ensureUniqueShortHandle(input: {
  userId: string;
  objectId: string;
  handle: string;
  maxLen?: number;
}): Promise<string> {
  const maxLen = input.maxLen ?? 7;
  const base = normalizeShortHandle(input.handle, maxLen);

  const existing = await getByHandle(input.userId, base);
  if (!existing || existing.id === input.objectId) return base;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomSuffix().slice(0, 2);
    const cut = Math.max(2, maxLen - suffix.length);
    const candidate = `${base.slice(0, cut)}${suffix}`;
    const hit = await getByHandle(input.userId, candidate);
    if (!hit) return candidate;
  }

  const fallback = `${base.slice(0, Math.max(2, maxLen - 1))}${randomSuffix().slice(0, 1)}`;
  return fallback.slice(0, maxLen);
}

export async function suggestHandleAction(
  input: HandleSuggestionInput & { seed?: string },
): Promise<{ handle: string }> {
  const ensured = await ensureUser();
  const obj = await getById(ensured.user_id, input.id);
  if (!obj) throw new Error("Not found.");

  const seed = (input.seed ?? "").trim() || pickHandleSeed(obj);
  const modelHandle = await generateHandle({ type: obj.type, seed });
  const baseHandle = normalizeShortHandle(modelHandle ?? seed, 7);
  const uniqueHandle = await ensureUniqueShortHandle({
    userId: ensured.user_id,
    objectId: obj.id,
    handle: baseHandle,
  });

  try {
    const updated = await update(ensured.user_id, obj.id, { handle: uniqueHandle });
    if (!updated) throw new Error("Not found.");
    return { handle: updated.handle };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const fallback = await ensureUniqueHandle({
      userId: ensured.user_id,
      objectId: obj.id,
      handle: withShortSuffix(uniqueHandle, randomSuffix()),
    });
    const updated = await update(ensured.user_id, obj.id, { handle: fallback });
    if (!updated) throw new Error("Not found.");
    return { handle: updated.handle };
  }
}
