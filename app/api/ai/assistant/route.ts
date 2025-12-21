import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { createIfMissing } from "@/db/users";
import { listRecent, type TruthObjectRow, type TruthObjectType } from "@/db/truth_objects";
import { buildAiPortfolioContext } from "@/db/trading_mirror";
import { normalizeShortHandle } from "@/lib/handles";
import { getDisplayTitle } from "@/lib/journal";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(12_000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  mode: z.enum(["auto", "ask", "make"]).optional(),
});

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).slice(0, 60);
}

function scoreText(text: string, terms: string[]): number {
  if (!terms.length) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of terms) {
    let idx = 0;
    while (true) {
      idx = lower.indexOf(t, idx);
      if (idx === -1) break;
      score += 1;
      idx += t.length;
      if (score > 100) return score;
    }
  }
  return score;
}

function objectSearchText(obj: TruthObjectRow): string {
  const parts: string[] = [];
  if (obj.handle) parts.push(obj.handle);
  if (obj.title) parts.push(obj.title);
  if (obj.body) parts.push(obj.body);
  const meta = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, unknown>) : null;
  if (obj.type === "belief" && meta && typeof meta.statement === "string") parts.push(meta.statement);
  if (obj.type === "prediction" && meta) {
    const market = meta.market && typeof meta.market === "object" ? (meta.market as Record<string, unknown>) : null;
    if (market && typeof market.question === "string") parts.push(market.question);
    const res = meta.resolution && typeof meta.resolution === "object" ? (meta.resolution as Record<string, unknown>) : null;
    if (res && typeof res.criteria === "string") parts.push(res.criteria);
  }
  return parts.join("\n");
}

function compactDate(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatObjectLine(obj: TruthObjectRow): string {
  const title = getDisplayTitle(obj);
  const updated = compactDate(obj.updated_at);
  const ref = `@${obj.handle}`;
  if (obj.type === "belief") {
    const meta = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, unknown>) : null;
    const st = meta && typeof meta.statement === "string" ? meta.statement : "";
    return `- [belief:${obj.id}] ${ref} (${updated}) ${st || title}`;
  }
  if (obj.type === "prediction") {
    const meta = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, unknown>) : null;
    const market = meta && typeof meta.market === "object" ? (meta.market as Record<string, unknown>) : null;
    const q = market && typeof market.question === "string" ? market.question : title;
    return `- [prediction:${obj.id}] ${ref} (${updated}) ${q}`;
  }
  return `- [${obj.type}:${obj.id}] ${ref} (${updated}) ${title}`;
}

function toContext({
  counts,
  relevant,
  recent,
  portfolioContext,
}: {
  counts: Record<string, number>;
  relevant: TruthObjectRow[];
  recent: TruthObjectRow[];
  portfolioContext?: string;
}): string {
  const stats = [
    `Notes: ${counts.note ?? 0}`,
    `Beliefs: ${counts.belief ?? 0}`,
    `Predictions: ${counts.prediction ?? 0}`,
    `Frameworks: ${counts.framework ?? 0}`,
    `Data: ${counts.data ?? 0}`,
  ].join(" • ");

  const relevantLines = relevant.length ? relevant.map(formatObjectLine).join("\n") : "- (none)";
  const recentLines = recent.length ? recent.map(formatObjectLine).join("\n") : "- (none)";

  const base = [
    "USER CONTEXT (private):",
    "",
    stats,
    "",
    "Relevant Objects (use @handle):",
    relevantLines,
    "",
    "Recent Objects:",
    recentLines,
  ].join("\n");

  if (portfolioContext && portfolioContext.trim()) {
    return `${base}\n\nMarket Account Context:\n${portfolioContext.trim()}`;
  }
  return base;
}

function toPlainConversation(messages: { role: string; content: string }[]): string {
  const clipped = messages.slice(-20);
  return clipped
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content.trim()}`)
    .join("\n");
}

async function streamOpenAiText(prompt: string, model: string): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response("Missing OPENAI_API_KEY on server.", { status: 500 });

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      stream: true,
      temperature: 0.8,
      max_output_tokens: 900,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    return new Response(text || `Upstream error: ${res.status}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const idx = buffer.indexOf("\n\n");
            if (idx === -1) break;
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = chunk.split("\n").map((l) => l.trim());
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.replace(/^data:\s*/, "");
            if (payload === "[DONE]") continue;
            let evt: unknown = null;
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (!evt || typeof evt !== "object") continue;
            const e = evt as Record<string, unknown>;
            if (e.type === "response.output_text.delta" && typeof e.delta === "string") {
              controller.enqueue(encoder.encode(e.delta));
            }
            if (e.type === "response.error") {
              const errObj =
                e.error && typeof e.error === "object" ? (e.error as Record<string, unknown>) : null;
              const msg = (errObj && typeof errObj.message === "string" ? errObj.message : null) ?? "Upstream error";
              controller.enqueue(encoder.encode(`\n\n[error] ${msg}`));
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}

type DraftObject =
  | {
      type: "belief";
      statement: string;
      confidence?: number | null;
      title?: string | null;
    }
  | {
      type: "prediction";
      question: string;
      probability?: number | null;
      close_at?: string | null;
      criteria?: string | null;
      sources?: string[];
      title?: string | null;
    }
  | {
      type: "framework";
      name: string;
      summary?: string | null;
      when_to_use?: string | null;
    }
  | {
      type: "data";
      title: string;
      body?: string | null;
      source_url?: string | null;
    }
  | {
      type: "note";
      title?: string | null;
      body: string;
    };

async function inferDraftObjectsNano(input: string): Promise<{
  mode: "ask" | "make";
  objects: DraftObject[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { mode: "ask", objects: [] };

  const model = "gpt-5-nano";
  const prompt = [
    "You route a user's message to either (ask) normal assistant chat or (make) create truth objects.",
    "",
    "Return ONLY valid JSON with this schema:",
    `{ "mode": "ask" | "make", "objects": DraftObject[] }`,
    "",
    "Rules:",
    "- Choose mode=make ONLY if the user clearly wants to save/create a belief/prediction/framework/data/note.",
    "- If unclear, choose ask.",
    "- Create at most 2 objects.",
    "- Minimal fields only; keep strings short.",
    "- probability/confidence are 0..1 or null.",
    "- close_at is ISO date YYYY-MM-DD or null.",
    "",
    "DraftObject union:",
    "- belief: {type:'belief', statement, confidence?, title?}",
    "- prediction: {type:'prediction', question, probability?, close_at?, criteria?, sources?, title?}",
    "- framework: {type:'framework', name, summary?, when_to_use?}",
    "- data: {type:'data', title, body?, source_url?}",
    "- note: {type:'note', title?, body}",
    "",
    `User message:\n${input.trim().slice(0, 2000)}`,
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 420,
    }),
  });

  if (!res.ok) return { mode: "ask", objects: [] };
  const data = (await res.json().catch(() => null)) as { output_text?: string } | null;
  const text = data?.output_text ?? "";
  try {
    const parsed = JSON.parse(text) as { mode?: unknown; objects?: unknown };
    const mode = parsed.mode === "make" ? "make" : "ask";
    const objects = Array.isArray(parsed.objects) ? parsed.objects : [];
    return { mode, objects: objects as DraftObject[] };
  } catch {
    return { mode: "ask", objects: [] };
  }
}

function titleFromText(s: string): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= 72) return t;
  return `${t.slice(0, 72).trimEnd()}…`;
}

async function createTruthObjectsFromDrafts(input: {
  userId: string;
  drafts: DraftObject[];
}): Promise<Array<{ id: string; type: TruthObjectType; handle: string; title: string }>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) throw new Error("Missing Supabase env vars.");

  const { createSupabaseServerClient } = await import("@/db/supabase/server");
  const supabase = createSupabaseServerClient();

  // Load existing handles to keep short handles unique.
  const { data: existing } = await supabase
    .from("truth_objects")
    .select("handle")
    .eq("user_id", input.userId)
    .limit(2000);
  const used = new Set(
    (existing ?? []).map((r) =>
      r && typeof r === "object" ? String((r as Record<string, unknown>).handle ?? "") : "",
    ),
  );

  function alloc(seed: string): string {
    const base = normalizeShortHandle(seed, 7);
    let candidate = base;
    for (let i = 0; i < 50; i += 1) {
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
      const suffix = String(i + 2);
      const cut = Math.max(2, 7 - suffix.length);
      candidate = `${base.slice(0, cut)}${suffix}`;
    }
    used.add(base);
    return base;
  }

  const rows: Array<{
    user_id: string;
    type: TruthObjectType;
    handle: string;
    title: string;
    body: string;
    confidence: number | null;
    source_url: string | null;
    metadata: Record<string, unknown>;
  }> = [];

  for (const d of input.drafts.slice(0, 2)) {
    if (!d || typeof d !== "object" || !("type" in d)) continue;
    if (d.type === "belief") {
      const statement = (d.statement ?? "").trim();
      if (!statement) continue;
      const title = titleFromText(d.title ?? statement);
      rows.push({
        user_id: input.userId,
        type: "belief",
        handle: alloc(title),
        title,
        body: "",
        confidence: typeof d.confidence === "number" ? Math.max(0, Math.min(1, d.confidence)) : null,
        source_url: null,
        metadata: { statement, source: { kind: "assistant" } },
      });
      continue;
    }
    if (d.type === "prediction") {
      const question = (d.question ?? "").trim();
      if (!question) continue;
      const title = titleFromText(d.title ?? question);
      const p = typeof d.probability === "number" ? Math.max(0, Math.min(1, d.probability)) : null;
      const sources = Array.isArray(d.sources) ? d.sources.filter((s) => typeof s === "string").slice(0, 8) : [];
      rows.push({
        user_id: input.userId,
        type: "prediction",
        handle: alloc(title),
        title,
        body: "",
        confidence: null,
        source_url: null,
        metadata: {
          market: {
            question,
            outcomes: [
              { key: "YES", label: "Yes" },
              { key: "NO", label: "No" },
            ],
          },
          position: { initial_probability: p, current_probability: p },
          timing: { close_at: typeof d.close_at === "string" ? d.close_at : "" },
          resolution: { criteria: typeof d.criteria === "string" ? d.criteria : "", source_urls: sources },
          source: { kind: "assistant" },
        },
      });
      continue;
    }
    if (d.type === "framework") {
      const name = (d.name ?? "").trim();
      if (!name) continue;
      const bodyParts: string[] = [];
      if (typeof d.summary === "string" && d.summary.trim()) bodyParts.push(d.summary.trim());
      if (typeof d.when_to_use === "string" && d.when_to_use.trim()) bodyParts.push(`When to use: ${d.when_to_use.trim()}`);
      rows.push({
        user_id: input.userId,
        type: "framework",
        handle: alloc(name),
        title: titleFromText(name),
        body: bodyParts.join("\n\n"),
        confidence: null,
        source_url: null,
        metadata: { when_to_use: typeof d.when_to_use === "string" ? d.when_to_use : null, source: { kind: "assistant" } },
      });
      continue;
    }
    if (d.type === "data") {
      const title = (d.title ?? "").trim();
      if (!title) continue;
      rows.push({
        user_id: input.userId,
        type: "data",
        handle: alloc(title),
        title: titleFromText(title),
        body: typeof d.body === "string" ? d.body : "",
        confidence: null,
        source_url: typeof d.source_url === "string" ? d.source_url : null,
        metadata: { source: { kind: "assistant" } },
      });
      continue;
    }
    if (d.type === "note") {
      const body = (d.body ?? "").trim();
      if (!body) continue;
      const title = titleFromText(d.title ?? body);
      rows.push({
        user_id: input.userId,
        type: "note",
        handle: alloc(title),
        title,
        body,
        confidence: null,
        source_url: null,
        metadata: { source: { kind: "assistant" } },
      });
    }
  }

  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("truth_objects")
    .insert(rows)
    .select("id, type, handle, title");
  if (error) throw error;

  const list = Array.isArray(data) ? (data as unknown[]) : [];
  return list.map((row) => {
    const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    return {
      id: String(r.id ?? ""),
      type: r.type as TruthObjectType,
      handle: String(r.handle ?? ""),
      title: String(r.title ?? ""),
    };
  });
}

function linkForCreated(obj: { id: string; type: TruthObjectType }): string {
  if (obj.type === "belief") return `/journal/beliefs?id=${encodeURIComponent(obj.id)}`;
  if (obj.type === "prediction") return `/journal/predictions?id=${encodeURIComponent(obj.id)}`;
  if (obj.type === "framework") return `/journal/frameworks?id=${encodeURIComponent(obj.id)}`;
  if (obj.type === "data") return `/journal/data?id=${encodeURIComponent(obj.id)}`;
  return `/journal/${encodeURIComponent(obj.id)}`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const ensured = await createIfMissing(userId);
  const mode = parsed.data.mode ?? "auto";
  const lastUser =
    [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Fast path: if the user is explicitly creating something, skip chat and create objects.
  const inferred = mode === "ask" ? { mode: "ask" as const, objects: [] } : await inferDraftObjectsNano(lastUser);
  const finalMode = mode === "make" ? "make" : mode === "ask" ? "ask" : inferred.mode;

  if (finalMode === "make") {
    const created = await createTruthObjectsFromDrafts({ userId: ensured.id, drafts: inferred.objects });
    if (!created.length) {
      return new Response(
        "I didn’t detect a concrete belief/prediction/framework/data/note to create. Try: “Make a belief: …” or “Create a prediction: …”",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const lines = created.map((c) => {
      const href = linkForCreated(c);
      return `Created ${c.type} @${c.handle}\n${href}`;
    });
    return new Response(lines.join("\n\n"), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const terms = tokenize(lastUser);
  const objects = await listRecent(ensured.id, { limit: 360 });
  const counts: Record<string, number> = { note: 0, belief: 0, prediction: 0, framework: 0, data: 0 };
  for (const o of objects) counts[o.type] = (counts[o.type] ?? 0) + 1;

  const relevant = objects
    .map((o) => ({
      o,
      score: scoreText(objectSearchText(o), terms) + scoreText(o.handle, terms) * 3,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map((x) => x.o);

  const recent = objects.slice(0, 10);
  const portfolioContext = await buildAiPortfolioContext(ensured.id).catch(() => "");
  const context = toContext({ counts, relevant, recent, portfolioContext });

  const systemPrompt = [
    "You are Qortana: a grounded co-thinker. Be direct, calm, and high-signal.",
    "Prefer referencing existing @handles over asking the user to restate things.",
    "If the user asks to create a belief/prediction/framework/data/note, tell them to switch to Make mode.",
  ].join("\n");

  const model = process.env.AI_CHAT_MODEL ?? "gpt-5-mini";
  const prompt = [
    `SYSTEM:\n${systemPrompt}`,
    "",
    context,
    "",
    "CONVERSATION:",
    toPlainConversation(parsed.data.messages),
    "",
    "ASSISTANT:",
  ].join("\n");

  return streamOpenAiText(prompt, model);
}
