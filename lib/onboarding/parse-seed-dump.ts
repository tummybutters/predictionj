import { slugifyHandle } from "@/lib/handles";

export type ParsedSeedDump = {
  beliefs: Array<{ statement: string; confidenceLabel: "high" | "medium" | "low" | null }>;
  frameworks: Array<{ name: string; whenToUse: string | null; summary: string | null }>;
  predictions: Array<{ question: string; probability: number | null }>;
  topics: string[];
  signals: string[];
  values: Array<{ statement: string; weightLabel: "high" | "medium" | "low" | null }>;
  tensions: string[];
};

type SectionKey =
  | "beliefs"
  | "frameworks"
  | "predictions"
  | "topics"
  | "signals"
  | "values"
  | "tensions";

function normalizeLine(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function isHeading(line: string): { key: SectionKey } | null {
  const l = normalizeLine(line).toLowerCase();
  const stripped = l.replace(/^[0-9]+\.\s*/, "");

  if (stripped === "core beliefs") return { key: "beliefs" };
  if (stripped.startsWith("mental frameworks")) return { key: "frameworks" };
  if (stripped.startsWith("active or implied predictions")) return { key: "predictions" };
  if (stripped.startsWith("topics i repeatedly care about")) return { key: "topics" };
  if (stripped.startsWith("signals or evidence")) return { key: "signals" };
  if (stripped.startsWith("values")) return { key: "values" };
  if (stripped.startsWith("notable tensions")) return { key: "tensions" };
  return null;
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^[-*•]\s+/, "").replace(/^\d+\)\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

function parseLabelSuffix(line: string): { text: string; label: "high" | "medium" | "low" | null } {
  const m = line.match(/\((high|medium|low)\)\s*$/i);
  if (!m) return { text: line.trim(), label: null };
  const label = m[1].toLowerCase() as "high" | "medium" | "low";
  const text = line.slice(0, m.index).trim();
  return { text, label };
}

function parseProbability(line: string): { text: string; probability: number | null } {
  const cleaned = line.replace(/[()]/g, " ");
  const m = cleaned.match(/\bp\s*[≈=]\s*(0(?:\.\d+)?|1(?:\.0+)?)\b/i);
  if (!m) return { text: line.trim(), probability: null };
  const raw = Number(m[1]);
  const p = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : null;
  const text = line.replace(m[0], "").replace(/\s{2,}/g, " ").trim();
  return { text, probability: p };
}

function splitNonEmptyLines(block: string): string[] {
  return (block ?? "")
    .split("\n")
    .map((l) => l.replace(/\t/g, " ").trimEnd())
    .filter((l) => l.trim().length > 0);
}

function parseBeliefs(lines: string[]): ParsedSeedDump["beliefs"] {
  const out: ParsedSeedDump["beliefs"] = [];
  for (const rawLine of lines) {
    const line = normalizeLine(stripBulletPrefix(rawLine));
    if (!line) continue;
    const { text, label } = parseLabelSuffix(line);
    if (!text) continue;
    out.push({ statement: text, confidenceLabel: label });
  }
  return out;
}

function parseTopics(lines: string[]): string[] {
  const out: string[] = [];
  for (const rawLine of lines) {
    const line = normalizeLine(stripBulletPrefix(rawLine));
    if (!line) continue;
    out.push(line);
  }
  return out;
}

function parseSignals(lines: string[]): string[] {
  return parseTopics(lines);
}

function parseTensions(lines: string[]): string[] {
  return parseTopics(lines);
}

function parseValues(lines: string[]): ParsedSeedDump["values"] {
  const out: ParsedSeedDump["values"] = [];
  for (const rawLine of lines) {
    const line = normalizeLine(stripBulletPrefix(rawLine));
    if (!line) continue;
    const { text, label } = parseLabelSuffix(line);
    out.push({ statement: text, weightLabel: label });
  }
  return out;
}

function parsePredictions(lines: string[]): ParsedSeedDump["predictions"] {
  const out: ParsedSeedDump["predictions"] = [];
  for (const rawLine of lines) {
    const line = normalizeLine(stripBulletPrefix(rawLine));
    if (!line) continue;
    const { text, probability } = parseProbability(line);
    if (!text) continue;
    out.push({ question: text, probability });
  }
  return out;
}

function parseFrameworks(lines: string[]): ParsedSeedDump["frameworks"] {
  // Frameworks tend to be chunks separated by blank lines, but our input arrives line-by-line.
  // Reconstruct rough chunks by treating "When:" as a detail line belonging to the most recent name.
  const out: ParsedSeedDump["frameworks"] = [];
  let curr: { name: string; whenToUse: string | null; summary: string | null } | null = null;

  for (const raw of lines) {
    const line = normalizeLine(stripBulletPrefix(raw));
    if (!line) continue;

    const whenMatch = line.match(/^when:\s*(.+)$/i);
    if (whenMatch && curr) {
      curr.whenToUse = whenMatch[1].trim();
      continue;
    }

    // If the line looks like a header (short and title-ish), start a new framework.
    const looksLikeName = line.length <= 80 && slugifyHandle(line).length >= 3;
    if (looksLikeName) {
      if (curr) out.push(curr);
      curr = { name: line, whenToUse: null, summary: null };
      continue;
    }

    // Otherwise treat as summary continuation.
    if (!curr) {
      curr = { name: "framework", whenToUse: null, summary: line };
      continue;
    }
    curr.summary = curr.summary ? `${curr.summary}\n${line}` : line;
  }

  if (curr) out.push(curr);
  return out.filter((f) => f.name.trim().length > 0);
}

export function parseSeedDump(rawText: string): ParsedSeedDump {
  const lines = (rawText ?? "").split("\n");
  const buckets: Record<SectionKey, string[]> = {
    beliefs: [],
    frameworks: [],
    predictions: [],
    topics: [],
    signals: [],
    values: [],
    tensions: [],
  };

  let curr: SectionKey | null = null;
  for (const rawLine of lines) {
    const heading = isHeading(rawLine);
    if (heading) {
      curr = heading.key;
      continue;
    }
    if (!curr) continue;
    buckets[curr].push(rawLine);
  }

  return {
    beliefs: parseBeliefs(splitNonEmptyLines(buckets.beliefs.join("\n"))),
    frameworks: parseFrameworks(splitNonEmptyLines(buckets.frameworks.join("\n"))),
    predictions: parsePredictions(splitNonEmptyLines(buckets.predictions.join("\n"))),
    topics: parseTopics(splitNonEmptyLines(buckets.topics.join("\n"))),
    signals: parseSignals(splitNonEmptyLines(buckets.signals.join("\n"))),
    values: parseValues(splitNonEmptyLines(buckets.values.join("\n"))),
    tensions: parseTensions(splitNonEmptyLines(buckets.tensions.join("\n"))),
  };
}
