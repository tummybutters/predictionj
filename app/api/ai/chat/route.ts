import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { createIfMissing } from "@/db/users";
import { countByType, listRecent, type TruthObjectRow } from "@/db/truth_objects";
import { buildAiPortfolioContext } from "@/db/trading_mirror";
import { derivePreview, getDisplayTitle } from "@/lib/journal";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8_000),
  thoughtSignature: z.string().optional(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).slice(0, 50);
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

function compactDate(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function readFromMetadataString(obj: TruthObjectRow, path: string[]): string | null {
  let curr: unknown = obj.metadata;
  for (const key of path) {
    if (!curr || typeof curr !== "object") return null;
    curr = (curr as Record<string, unknown>)[key];
  }
  return typeof curr === "string" ? curr : null;
}

function readPredictionProbability(obj: TruthObjectRow): number | null {
  if (!obj.metadata || typeof obj.metadata !== "object") return null;
  const pos = (obj.metadata as Record<string, unknown>).position;
  if (!pos || typeof pos !== "object") return null;
  const cur = (pos as Record<string, unknown>).current_probability;
  const init = (pos as Record<string, unknown>).initial_probability;
  const n = typeof cur === "number" ? cur : typeof init === "number" ? init : null;
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function objectSearchText(obj: TruthObjectRow): string {
  const parts: string[] = [];
  if (obj.handle) parts.push(obj.handle);
  if (obj.title) parts.push(obj.title);
  if (obj.body) parts.push(obj.body);
  if (obj.type === "belief") {
    const st = readFromMetadataString(obj, ["statement"]);
    if (st) parts.push(st);
  }
  if (obj.type === "prediction") {
    const q = readFromMetadataString(obj, ["market", "question"]);
    if (q) parts.push(q);
    const c = readFromMetadataString(obj, ["resolution", "criteria"]);
    if (c) parts.push(c);
  }
  return parts.join("\n");
}

function formatObjectLine(obj: TruthObjectRow): string {
  const title = getDisplayTitle(obj);
  const updated = compactDate(obj.updated_at);
  const ref = `@${obj.handle}`;

  if (obj.type === "belief") {
    const statement = readFromMetadataString(obj, ["statement"]) ?? "";
    const pct = obj.confidence != null ? Math.round(obj.confidence * 100) : null;
    return `- [belief:${obj.id}] ${ref} (${updated}) ${pct != null ? `conf=${pct}%` : ""} ${statement || title}`;
  }

  if (obj.type === "prediction") {
    const question = readFromMetadataString(obj, ["market", "question"]) ?? title;
    const p = readPredictionProbability(obj);
    const closeAt = readFromMetadataString(obj, ["timing", "close_at"]);
    return `- [prediction:${obj.id}] ${ref} (${updated}) p=${p != null ? Math.round(p * 100) : "—"}%${
      closeAt ? ` close=${closeAt}` : ""
    } ${question}`;
  }

  const preview = derivePreview(obj.body).slice(0, 220);
  const label = obj.type === "note" ? "note" : obj.type;
  return `- [${label}:${obj.id}] ${ref} (${updated}) ${title}${preview ? `: ${preview}` : ""}`;
}

function toContextV2({
  counts,
  relevant,
  recentNotes,
  recentBeliefs,
  recentPredictions,
  portfolioContext,
}: {
  counts: Record<string, number>;
  relevant: TruthObjectRow[];
  recentNotes: TruthObjectRow[];
  recentBeliefs: TruthObjectRow[];
  recentPredictions: TruthObjectRow[];
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
  const notesLines = recentNotes.length ? recentNotes.map(formatObjectLine).join("\n") : "- (none)";
  const beliefLines = recentBeliefs.length
    ? recentBeliefs.map(formatObjectLine).join("\n")
    : "- (none)";
  const predictionLines = recentPredictions.length
    ? recentPredictions.map(formatObjectLine).join("\n")
    : "- (none)";

  const base = [
    "USER CONTEXT (private; only the user can see this):",
    "",
    "High-level Stats:",
    stats,
    "",
    "Most Relevant Objects (use @handle to reference):",
    relevantLines,
    "",
    "Recent Notes:",
    notesLines,
    "",
    "Recent Beliefs:",
    beliefLines,
    "",
    "Recent Predictions:",
    predictionLines,
  ].join("\n");

  if (portfolioContext && portfolioContext.trim()) {
    return `${base}\n\nMarket Account Context:\n${portfolioContext.trim()}`;
  }

  return base;
}

type RateLimitState = { windowStartMs: number; count: number };
const rateLimitState = new Map<string, RateLimitState>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 30;

  const curr = rateLimitState.get(key);
  if (!curr || now - curr.windowStartMs >= windowMs) {
    rateLimitState.set(key, { windowStartMs: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (curr.count >= max) {
    const remaining = Math.max(0, windowMs - (now - curr.windowStartMs));
    return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000) };
  }

  curr.count += 1;
  rateLimitState.set(key, curr);
  return { allowed: true, retryAfterSeconds: 0 };
}

async function streamGeminiText(
  messages: { role: string; content: string; thoughtSignature?: string }[],
): Promise<Response> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return new Response("Missing GOOGLE_AI_API_KEY on server.", { status: 500 });
  }

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
    // Thought signatures are handled by the SDK usually, but in REST they are part of the content part
    ...(m.thoughtSignature ? { thoughtSignature: m.thoughtSignature } : {}),
  }));

  const payload = {
    contents,
    generationConfig: {
      temperature: 1.0, // Gemini 3 recommends 1.0
      maxOutputTokens: 2048,
      thinking_config: {
        thinking_level: "high", // Defaulting to high for better reasoning
      },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    // Using v1alpha for Gemini 3 features like thinking_level and thoughtSignatures
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:streamGenerateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
  } catch (e) {
    console.error("Gemini fetch error:", e);
    const isAbort = e instanceof DOMException ? e.name === "AbortError" : false;
    return new Response(isAbort ? "Upstream timeout." : "Upstream request failed.", {
      status: isAbort ? 504 : 502,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error("Gemini error response:", text);
    return new Response(text || `Upstream error: ${res.status}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Gemini streaming format is a JSON array of objects, but delivered as SSE-like chunks or just concatenated JSON
          // Actually, streamGenerateContent returns a JSON array: [ {...}, {...} ] or individual objects if using alt=sse
          // For simplicity, we'll try to parse the buffer as it grows or use a regex to find text parts.

          let match;
          const textRegex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
          while ((match = textRegex.exec(buffer)) !== null) {
            const text = JSON.parse(`"${match[1]}"`); // Unescape string
            controller.enqueue(encoder.encode(text));
            buffer = buffer.slice(match.index + match[0].length);
            textRegex.lastIndex = 0; // Reset regex to start from new buffer position
          }

          // Also look for thought signatures if needed (not strictly required for text output but good for history)
          // For now, we only care about the text stream.
        }
      } catch (e) {
        console.error("Stream processing error:", e);
        controller.error(e);
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return new Response("Rate limit exceeded.", {
      status: 429,
      headers: {
        "retry-after": String(rl.retryAfterSeconds),
      },
    });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  if (provider !== "gemini") {
    return new Response(`Unsupported AI_PROVIDER: ${provider}`, { status: 500 });
  }

  const ensured = await createIfMissing(userId);

  const lastUser =
    [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const terms = tokenize(lastUser);

  const [counts, objects] = await Promise.all([
    countByType(ensured.id),
    listRecent(ensured.id, { limit: 420 }),
  ]);

  const relevant = objects
    .map((o) => ({
      o,
      score: scoreText(objectSearchText(o), terms) + scoreText(o.handle, terms) * 3,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((x) => x.o);

  const recentNotes = objects.filter((o) => o.type === "note").slice(0, 8);
  const recentBeliefs = objects.filter((o) => o.type === "belief").slice(0, 8);
  const recentPredictions = objects.filter((o) => o.type === "prediction").slice(0, 8);

  const systemPrompt = `
# Identity
You are the user's Intellectual Companion—a co-thinker and sounding board. Your vibe is "Brilliant Friend": warm, direct, and deeply curious about the user's mental frameworks. You don't "assist"; you collaborate on fleshing out the user's internal map of reality.

# Core Mission: Fleshing Out
Your goal is to turn simple thoughts into robust frameworks. When the user shares an idea, prediction, or belief:
1. **Steel-manning**: Strengthen their logic. Find the most sophisticated version of their argument.
2. **Identifying Cruxes**: Find the single most important variable that would make a prediction fail or a belief crumble.
3. **Synthesis**: Connect new ideas to their existing context (Journal, Predictions, Beliefs). Look for the "Golden Thread" in their history.
4. **Framework Scaffolding**: Transform "I think X" into "Here is a 3-part model for why X might happen."

# Anti-Cringe Guidelines
- **No Corny Fillers**: Avoid "Great job!", "I'm here to help,", or "That's a fascinating prediction!". Start with the insight, not the pleasantry.
- **No Forced Follow-ups**: Do not end every message with a generic question ("What do you think?"). Only ask a question if you've hit an actual wall in the reasoning and need the user's input to go deeper.
- **Directness**: If a user's confidence score seems mismatched with their journal entries, point it out directly but thoughtfully.

# Formatting & Spacing
- **Visual Breathing Room**: Use Markdown headers (##) and bolding for key terms.
- **Satisfying White Space**: Use double line breaks between paragraphs.
- **Citations**: Weave references like [note:<id>] / [belief:<id>] / [prediction:<id>] and @handles naturally into your sentences.

# Contextual Awareness
You have access to the user's **truth objects** (notes, beliefs, predictions, frameworks, data) plus their @handles. Prefer reusing and linking prior thinking instead of asking the user to restate it.

# Internal Reasoning
You are Gemini 3, a state-of-the-art reasoning model. Use your thinking process to provide deep, high-quality analysis. Aim to make the USER feel smarter by the end of the conversation.
`;

  const portfolioContext = await buildAiPortfolioContext(ensured.id).catch(() => "");
  const context = toContextV2({
    counts,
    relevant,
    recentNotes,
    recentBeliefs,
    recentPredictions,
    portfolioContext,
  });

  const finalMessages = [
    { role: "user", content: `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\n${context}` },
    ...parsed.data.messages,
  ];

  return streamGeminiText(finalMessages);
}
