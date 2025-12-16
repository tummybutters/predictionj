import { z } from "zod";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const resolveByInput = z
  .string()
  .trim()
  .min(1)
  .transform((v, ctx) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const month = Number(mdy[1]);
      const day = Number(mdy[2]);
      const year = Number(mdy[3]);
      const iso = `${year}-${pad2(month)}-${pad2(day)}`;
      const t = Date.parse(`${iso}T00:00:00Z`);
      if (Number.isFinite(t)) return iso;
    }

    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date." });
    return z.NEVER;
  });

const confidenceInput = z.preprocess((v) => {
  if (typeof v === "string") return v.trim().replace(/%$/, "");
  return v;
}, z.union([z.string().min(1), z.number()]));

const stakeInput = z.preprocess((v) => {
  if (typeof v === "string") return v.trim().replace(/,/g, "");
  return v;
}, z.union([z.string().min(1), z.number()]));

const lineInput = z.preprocess((v) => {
  if (typeof v === "string") return v.trim().replace(/%$/, "");
  return v;
}, z.union([z.string().min(1), z.number()]));

export const predictionCreateSchema = z.object({
  question: z.string().trim().min(1).max(500),
  confidence: confidenceInput.transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid confidence." });
      return z.NEVER;
    }
    const normalized = n > 1 ? n / 100 : n;
    if (normalized < 0 || normalized > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confidence must be 0–1 or 0–100.",
      });
      return z.NEVER;
    }
    return normalized;
  }),
  reference_line: lineInput
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === null || v === "") return 0.5;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid line." });
        return z.NEVER;
      }
      const normalized = n > 1 ? n / 100 : n;
      if (normalized <= 0 || normalized >= 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Line must be between 0 and 1.",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  resolve_by: resolveByInput,
});

export const predictionUpdateSchema = predictionCreateSchema.extend({
  id: z.string().uuid(),
});

export const predictionDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const predictionResolveSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(["true", "false"]),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const predictionBetUpsertSchema = z.object({
  prediction_id: z.string().uuid(),
  stake: stakeInput.transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid stake." });
      return z.NEVER;
    }
    if (n <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stake must be > 0." });
      return z.NEVER;
    }
    if (n > 1_000_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stake too large." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  }),
});

export const predictionBetDeleteSchema = z.object({
  prediction_id: z.string().uuid(),
});

export const predictionForecastUpdateSchema = z.object({
  prediction_id: z.string().uuid(),
  probability: confidenceInput.transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid probability." });
      return z.NEVER;
    }
    const normalized = n > 1 ? n / 100 : n;
    if (normalized < 0 || normalized > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Probability must be 0–1 or 0–100.",
      });
      return z.NEVER;
    }
    return normalized;
  }),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const predictionLineUpdateSchema = z.object({
  prediction_id: z.string().uuid(),
  reference_line: lineInput.transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid line." });
      return z.NEVER;
    }
    const normalized = n > 1 ? n / 100 : n;
    if (normalized <= 0 || normalized >= 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Line must be between 0 and 1.",
      });
      return z.NEVER;
    }
    return normalized;
  }),
});

export const paperPositionOpenSchema = z.object({
  prediction_id: z.string().uuid(),
  side: z.enum(["yes", "no"]),
  stake: stakeInput.transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid stake." });
      return z.NEVER;
    }
    if (n <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stake must be > 0." });
      return z.NEVER;
    }
    if (n > 1_000_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stake too large." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  }),
});
