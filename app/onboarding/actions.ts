"use server";

import { ensureUser } from "@/services/auth/ensure-user";
import { createSupabaseServerClient } from "@/db/supabase/server";
import type { TruthObjectType } from "@/db/truth_objects";
import type { TruthObjectLinkRelation } from "@/db/truth_object_links";
import { normalizeShortHandle } from "@/lib/handles";
import { parseSeedDump } from "@/lib/onboarding/parse-seed-dump";

type InsertTruthObject = {
  user_id: string;
  type: TruthObjectType;
  handle: string;
  title: string;
  body: string;
  confidence: number | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function labelToWeight(label: "high" | "medium" | "low" | null): number | null {
  if (!label) return null;
  if (label === "high") return 0.8;
  if (label === "medium") return 0.6;
  return 0.4;
}

function titleFromSentence(s: string): string {
  const cleaned = (s ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "");
  if (cleaned.length <= 64) return cleaned;
  const cut = cleaned.slice(0, 64);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 28 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).slice(0, 80);
}

function intersectionSize(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let score = 0;
  for (const t of a) {
    if (setB.has(t)) score += 1;
    if (score > 30) return score;
  }
  return score;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function importOnboardingSeedDumpAction(input: {
  rawText: string;
}): Promise<{
  created: number;
  byType: Record<TruthObjectType, number>;
  createdLinks: number;
}> {
  const ensured = await ensureUser();
  const supabase = createSupabaseServerClient();

  const rawText = (input.rawText ?? "").trim();
  if (rawText.length < 40) {
    throw new Error("Paste a longer response from your AI.");
  }

  const parsed = parseSeedDump(rawText);

  const { data: existingRows, error: existingErr } = await supabase
    .from("truth_objects")
    .select("handle")
    .eq("user_id", ensured.user_id)
    .limit(5000);
  if (existingErr) throw existingErr;
  const used = new Set((existingRows ?? []).map((r) => String((r as { handle?: unknown }).handle ?? "")));

  function allocHandle(seed: string): string {
    const maxLen = 7;
    const base = normalizeShortHandle(seed, maxLen);
    let candidate = base;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
      const suffix = String(attempt + 2);
      const cut = Math.max(2, maxLen - suffix.length);
      candidate = `${base.slice(0, cut)}${suffix}`;
    }
    // Extremely unlikely; last resort.
    const fallback = `${base.slice(0, 5)}x1`.slice(0, maxLen);
    used.add(fallback);
    return fallback;
  }

  const objects: InsertTruthObject[] = [];

  for (const b of parsed.beliefs.slice(0, 30)) {
    const confidence = labelToWeight(b.confidenceLabel);
    const title = titleFromSentence(b.statement);
    objects.push({
      user_id: ensured.user_id,
      type: "belief",
      handle: allocHandle(title),
      title,
      body: "",
      confidence: confidence == null ? null : clamp01(confidence),
      source_url: null,
      metadata: { statement: b.statement, source: { kind: "onboarding_seed" } },
    });
  }

  for (const f of parsed.frameworks.slice(0, 20)) {
    const title = titleFromSentence(f.name);
    const bodyParts: string[] = [];
    if (f.summary) bodyParts.push(f.summary.trim());
    if (f.whenToUse) bodyParts.push(`When to use: ${f.whenToUse.trim()}`);
    objects.push({
      user_id: ensured.user_id,
      type: "framework",
      handle: allocHandle(title),
      title,
      body: bodyParts.join("\n\n"),
      confidence: null,
      source_url: null,
      metadata: { when_to_use: f.whenToUse ?? null, source: { kind: "onboarding_seed" } },
    });
  }

  for (const p of parsed.predictions.slice(0, 30)) {
    const title = titleFromSentence(p.question);
    const prob = p.probability == null ? null : clamp01(p.probability);
    objects.push({
      user_id: ensured.user_id,
      type: "prediction",
      handle: allocHandle(title),
      title,
      body: "",
      confidence: null,
      source_url: null,
      metadata: {
        market: {
          question: p.question,
          outcomes: [
            { key: "YES", label: "Yes" },
            { key: "NO", label: "No" },
          ],
        },
        position: {
          initial_probability: prob,
          current_probability: prob,
        },
        timing: { close_at: "" },
        resolution: { criteria: "", source_urls: [] },
        source: { kind: "onboarding_seed" },
      },
    });
  }

  for (const label of parsed.topics.slice(0, 40)) {
    const title = titleFromSentence(label);
    objects.push({
      user_id: ensured.user_id,
      type: "note",
      handle: allocHandle(title),
      title,
      body: "",
      confidence: null,
      source_url: null,
      metadata: { kind: "topic", source: { kind: "onboarding_seed" } },
    });
  }

  for (const signal of parsed.signals.slice(0, 40)) {
    const title = titleFromSentence(signal);
    objects.push({
      user_id: ensured.user_id,
      type: "data",
      handle: allocHandle(title),
      title,
      body: signal,
      confidence: null,
      source_url: null,
      metadata: { kind: "signal", source: { kind: "onboarding_seed" } },
    });
  }

  for (const v of parsed.values.slice(0, 30)) {
    const title = titleFromSentence(v.statement);
    const weight = labelToWeight(v.weightLabel);
    objects.push({
      user_id: ensured.user_id,
      type: "note",
      handle: allocHandle(title),
      title,
      body: v.statement,
      confidence: null,
      source_url: null,
      metadata: { kind: "value", weight, source: { kind: "onboarding_seed" } },
    });
  }

  for (const t of parsed.tensions.slice(0, 30)) {
    const title = titleFromSentence(t);
    objects.push({
      user_id: ensured.user_id,
      type: "note",
      handle: allocHandle(title),
      title,
      body: t,
      confidence: null,
      source_url: null,
      metadata: { kind: "tension", source: { kind: "onboarding_seed" } },
    });
  }

  if (!objects.length) {
    throw new Error(
      "Could not detect the expected headings. Make sure your pasted text includes the section headers (Core Beliefs, Mental Frameworks, etc.).",
    );
  }

  const byType: Record<TruthObjectType, number> = {
    note: 0,
    belief: 0,
    prediction: 0,
    framework: 0,
    data: 0,
  };
  for (const o of objects) byType[o.type] += 1;

  const inserted: Array<{ id: string; handle: string; type: TruthObjectType; title: string; body: string; metadata: unknown }> =
    [];

  for (const batch of chunk(objects, 50)) {
    const { data, error } = await supabase
      .from("truth_objects")
      .insert(batch)
      .select("id, handle, type, title, body, metadata");
    if (error) throw error;
    inserted.push(...((data ?? []) as typeof inserted));
  }

  // Create a few "starter" links so the overview graph is non-empty.
  const candidates = inserted.map((o) => ({
    handle: o.handle,
    id: o.id,
    type: o.type,
    text: `${o.handle}\n${o.title}\n${o.body}`,
    kind:
      o.metadata && typeof o.metadata === "object" && typeof (o.metadata as Record<string, unknown>).kind === "string"
        ? String((o.metadata as Record<string, unknown>).kind)
        : null,
  }));

  const primary = candidates.filter((c) => ["belief", "prediction", "framework"].includes(c.type));
  const linkSources = candidates.filter((c) => c.kind === "topic" || c.kind === "signal" || c.kind === "tension" || c.kind === "value");

  const rel: TruthObjectLinkRelation = "related";
  const linkRows: Array<{
    user_id: string;
    from_object_id: string;
    to_object_id: string;
    relation: TruthObjectLinkRelation;
    note: string | null;
  }> = [];

  for (const src of linkSources) {
    const srcTokens = tokenize(src.text);
    const scored = primary
      .map((dst) => {
        const score = intersectionSize(srcTokens, tokenize(dst.text));
        return { dst, score };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const { dst, score } of scored) {
      if (src.id === dst.id) continue;
      linkRows.push({
        user_id: ensured.user_id,
        from_object_id: src.id,
        to_object_id: dst.id,
        relation: rel,
        note: score >= 5 ? "strong overlap" : null,
      });
    }
  }

  if (linkRows.length) {
    const { error } = await supabase
      .from("truth_object_links")
      .upsert(linkRows, { onConflict: "from_object_id,to_object_id,relation" })
      .select("id");
    if (error) throw error;
  }

  return {
    created: inserted.length,
    byType,
    createdLinks: linkRows.length,
  };
}
