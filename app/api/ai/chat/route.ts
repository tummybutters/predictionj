import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { ensureUser } from "@/services/auth/ensure-user";
import { list as listJournalEntries } from "@/db/journal_entries";
import { listOpen as listOpenPredictions } from "@/db/predictions";
import { list as listBeliefs } from "@/db/beliefs";
import { derivePreview, getDisplayTitle } from "@/app/journal/_components/journal-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20_000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).slice(0, 24);
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
      if (score > 60) return score;
    }
  }
  return score;
}

function compactDate(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toContext({
  journal,
  predictions,
  beliefs,
}: {
  journal: { id: string; title: string; entry_at: string; preview: string }[];
  predictions: { id: string; claim: string; confidence: number; resolution_date: string }[];
  beliefs: { id: string; statement: string; is_foundational: boolean }[];
}): string {
  const journalLines = journal.length
    ? journal
        .map(
          (e) =>
            `- [journal:${e.id}] ${e.title} (${compactDate(e.entry_at)}): ${e.preview}`,
        )
        .join("\n")
    : "- (none)";

  const predictionLines = predictions.length
    ? predictions
        .map(
          (p) =>
            `- [prediction:${p.id}] ${p.claim} (p=${p.confidence}%, due ${compactDate(
              p.resolution_date,
            )})`,
        )
        .join("\n")
    : "- (none)";

  const beliefLines = beliefs.length
    ? beliefs
        .map(
          (b) =>
            `- [belief:${b.id}] ${b.statement}${
              b.is_foundational ? " (foundational)" : ""
            }`,
        )
        .join("\n")
    : "- (none)";

  return [
    "USER CONTEXT (private; only the user can see this):",
    "",
    "Journal (most relevant):",
    journalLines,
    "",
    "Open predictions:",
    predictionLines,
    "",
    "Beliefs:",
    beliefLines,
  ].join("\n");
}

async function streamOpenAIText(payload: unknown): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY on server.", { status: 500 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    return new Response(text || `Upstream error: ${res.status}`, {
      status: 500,
    });
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

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice("data:".length).trim();
            if (!data) continue;
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const chunk = json.choices?.[0]?.delta?.content;
              if (chunk) controller.enqueue(encoder.encode(chunk));
            } catch {
              // Ignore malformed lines.
            }
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const ensured = await ensureUser();

  const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const terms = tokenize(lastUser);

  const [journalEntries, predictions, beliefs] = await Promise.all([
    listJournalEntries(ensured.user_id, { limit: 200 }),
    listOpenPredictions(ensured.user_id, { limit: 200 }),
    listBeliefs(ensured.user_id, { limit: 80 }),
  ]);

  const relevantJournal = journalEntries
    .map((e) => {
      const title = getDisplayTitle(e);
      const preview = derivePreview(e.body);
      const score = scoreText(`${title}\n${preview}\n${e.body}`, terms) + scoreText(title, terms) * 2;
      return { e, title, preview, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ e, title, preview }) => ({
      id: e.id,
      title,
      entry_at: e.entry_at,
      preview: preview.slice(0, 220),
    }));

  const relevantPredictions = predictions
    .map((p) => ({ p, score: scoreText(p.claim, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ p }) => ({
      id: p.id,
      claim: p.claim,
      confidence: p.confidence,
      resolution_date: p.resolution_date,
    }));

  const relevantBeliefs = beliefs
    .map((b) => ({ b, score: scoreText(b.statement, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ b }) => ({
      id: b.id,
      statement: b.statement,
      is_foundational: b.is_foundational,
    }));

  const system = [
    "You are an assistant inside the user's Prediction Journal app.",
    "You can use the USER CONTEXT below to answer and to reference the user's own entries/predictions/beliefs.",
    "Do not invent content not present in the context; if something is missing, ask a follow-up question.",
    "Be concise and practical. When you reference a specific item, cite it like [journal:<id>] or [prediction:<id>].",
  ].join("\n");

  const context = toContext({
    journal: relevantJournal,
    predictions: relevantPredictions,
    beliefs: relevantBeliefs,
  });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  return streamOpenAIText({
    model,
    temperature: 0.4,
    stream: true,
    messages: [{ role: "system", content: system }, { role: "system", content: context }, ...parsed.data.messages],
  });
}

