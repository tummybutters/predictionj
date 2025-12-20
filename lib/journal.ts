export type JournalEntryLike = {
  title?: string | null;
  body: string;
};

function firstNonEmptyLine(body: string): string | null {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function deriveTitle(body: string): string | null {
  const line = firstNonEmptyLine(body);
  if (!line) return null;
  return line.slice(0, 80);
}

export function derivePreview(body: string): string {
  const lines = body.split(/\r?\n/);
  const meaningful = lines.map((l) => l.trim()).filter(Boolean);
  if (meaningful.length === 0) return "";
  if (meaningful.length === 1) return meaningful[0];
  return meaningful.slice(1).join(" · ").slice(0, 140);
}

export function getDisplayTitle(entry: JournalEntryLike): string {
  const explicit = entry.title?.trim();
  if (explicit) return explicit;
  return deriveTitle(entry.body) ?? "Untitled";
}
