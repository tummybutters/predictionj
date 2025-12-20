export function slugifyHandle(input: string): string {
  const s = (input ?? "").toLowerCase().trim();
  const cleaned = s
    .replace(/['".,!?()[\]{}]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
}

export function normalizeHandle(input: string): string {
  const base = slugifyHandle(input);
  if (base.length >= 2) return base.slice(0, 40).replace(/-$/g, "");
  return "obj";
}

export function withShortSuffix(handle: string, suffix: string): string {
  const base = normalizeHandle(handle);
  const safeSuffix = slugifyHandle(suffix).slice(0, 8) || "x";
  const joined = `${base}-${safeSuffix}`;
  return joined.length <= 40 ? joined : joined.slice(0, 40).replace(/-$/g, "");
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function isDefaultHandle(handle: string | null | undefined): boolean {
  const h = normalizeHandle(handle ?? "");
  if (!h || h === "obj") return true;
  if (h.startsWith("new-")) return true;
  return ["note", "belief", "prediction", "framework", "data"].includes(h);
}
