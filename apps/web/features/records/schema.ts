import { z } from "zod";

export const recordPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    end_cursor: z.string().nullable(),
    has_next_page: z.boolean(),
  });
export const sourceSchema = z.object({
  id: z.string(),
  version: z.number(),
  label: z.string(),
  created_at: z.string(),
});
export const consultationRow = z.object({
  id: z.string(),
  patient_id: z.string().optional(),
  provider_name: z.string().optional(),
  patient_name: z.string(),
  reason: z.string(),
  status: z.string(),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
