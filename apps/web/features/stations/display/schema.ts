import { z } from "zod";

export const displayEntrySchema = z
  .object({
    key: z.string(),
    label: z.string(),
    department: z.string(),
    provider: z.string().nullable(),
    counter: z.string(),
    status: z.enum(["called", "in_service", "waiting"]),
    call_token: z.string().nullable(),
  })
  .strict();
export const displaySchema = z
  .object({
    schema_version: z.literal(1),
    clinic: z.string(),
    branch: z.string(),
    timezone: z.string(),
    day: z.string(),
    server_time: z.string(),
    revision: z.number(),
    called: z.array(displayEntrySchema).max(12),
    upcoming: z.array(displayEntrySchema).max(20),
    announcements: z.array(z.string().max(240)).max(3),
  })
  .strict();
export type DisplaySnapshot = z.infer<typeof displaySchema>;
