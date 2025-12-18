import "server-only";

/**
 * Safely converts an unknown value to a number.
 * Returns 0 if the value is not a finite number.
 */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Safely converts an unknown value to a string.
 */
export function toString(v: unknown): string {
  return String(v ?? "");
}
