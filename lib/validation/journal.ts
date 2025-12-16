import { z } from "zod";

export const journalEntryCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  body: z.string().max(50_000),
});

export const journalEntryUpdateSchema = journalEntryCreateSchema.extend({
  id: z.string().uuid(),
});

export const journalEntryDeleteSchema = z.object({
  id: z.string().uuid(),
});
