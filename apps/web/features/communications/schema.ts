import { z } from "zod";

export const preferenceSchema = z.object({
  version: z.number(),
  recipient: z.string(),
  recipient_name: z.string(),
  recipient_user_id: z.string().nullable(),
  sms_enabled: z.boolean(),
  in_app_enabled: z.boolean(),
  appointments: z.boolean(),
  follow_ups: z.boolean(),
  billing: z.boolean(),
  confirmed_at: z.string().nullable(),
});
export const communicationSetupSchema = z.object({
  transport: z.string(),
  timezone: z.string(),
  can_configure: z.boolean(),
  settings: z.object({
    version: z.number(),
    appointment_automatic: z.boolean(),
    follow_up_automatic: z.boolean(),
  }),
  branches: z.array(z.object({ id: z.string(), name: z.string() })),
  patients: z.array(z.object({ id: z.string(), name: z.string(), reference: z.string() })),
  preference: preferenceSchema.optional(),
  recipients: z
    .array(z.object({ id: z.string(), name: z.string(), relationship: z.string() }))
    .optional(),
  sources: z
    .array(z.object({ id: z.string(), kind: z.string(), label: z.string(), message: z.string() }))
    .optional(),
});
export type CommunicationSetup = z.infer<typeof communicationSetupSchema>;
export const reminderSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  patient_name: z.string(),
  source_kind: z.string(),
  source_id: z.string(),
  channel: z.string(),
  due_at: z.string(),
  state: z.string(),
  transport: z.string(),
  attempts: z.number(),
  error_code: z.string(),
  version: z.number(),
  message: z.string(),
  automatic: z.boolean(),
  created_at: z.string(),
  events: z.array(z.object({ state: z.string(), code: z.string(), created_at: z.string() })),
});
export const reminderPageSchema = z.object({
  items: z.array(reminderSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
});
