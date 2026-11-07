import { z } from "zod";

const identity = z.object({ id: z.string(), name: z.string() });
export const setupSchema = z.object({
  branch_id: z.string(),
  timezone: z.string(),
  branches: z.array(identity),
  providers: z.array(identity.extend({ photo_id: z.string().nullable().optional() })),
  patients: z.array(
    identity.extend({ reference: z.string(), portrait_id: z.string().nullable().optional() }),
  ),
  resources: z.array(identity.extend({ active: z.boolean(), version: z.number() })),
  schedules: z.array(
    z.object({
      id: z.string(),
      provider_id: z.string(),
      weekday: z.number(),
      effective_from: z.string(),
      effective_to: z.string(),
      opens: z.string(),
      closes: z.string(),
      duration: z.number(),
      active: z.boolean(),
      version: z.number(),
    }),
  ),
  overrides: z.array(
    z.object({
      id: z.string(),
      provider_id: z.string().nullable(),
      date: z.string(),
      closed: z.boolean(),
      opens: z.string().nullable(),
      closes: z.string().nullable(),
      version: z.number(),
    }),
  ),
  permissions: z.array(z.string()),
});
export type OperationsSetup = z.infer<typeof setupSchema>;
export const slotSchema = z.object({
  start: z.string(),
  end: z.string(),
  local: z.string(),
  timezone: z.string(),
});
export const slotsSchema = z.array(slotSchema);
export const appointmentSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  provider: z.string(),
  provider_photo_id: z.string().nullable().optional(),
  patient_portrait_id: z.string().nullable().optional(),
  branch_id: z.string(),
  branch: z.string(),
  start: z.string(),
  end: z.string(),
  type: z.string(),
  status: z.string(),
  version: z.number(),
  resource_id: z.string().nullable(),
  resource: z.string().nullable(),
  patient_id: z.string().optional(),
  patient: z.string().optional(),
  reference: z.string().optional(),
  reason: z.string().optional(),
  online_room_id: z.string().nullable().optional(),
  online_timing_mode: z.enum(["scheduled", "instant"]).nullable().optional(),
  ticket: z
    .lazy(() => ticketSchema)
    .nullable()
    .optional(),
});
export type Appointment = z.infer<typeof appointmentSchema>;
export const appointmentPageSchema = z.object({
  items: z.array(appointmentSchema),
  has_next_page: z.boolean(),
  end_cursor: z.string().nullable(),
  calendar: z
    .object({
      hours: z.array(
        z.object({ provider_id: z.string(), date: z.string(), start: z.string(), end: z.string() }),
      ),
      in_service: z.array(z.lazy(() => ticketSchema)),
      daily_counts: z.array(z.object({ date: z.string(), count: z.number() })).default([]),
      previews: z.array(appointmentSchema).default([]),
      updated_at: z.string(),
    })
    .optional(),
});
const estimate = z.object({
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  label: z.string(),
  basis: z.string(),
  calculated_at: z.string(),
});
export const ticketSchema = z.object({
  id: z.string(),
  number: z.number(),
  day: z.string(),
  status: z.string(),
  version: z.number(),
  delay: z.number(),
  duration: z.number(),
  provider: z.string(),
  provider_photo_id: z.string().nullable().optional(),
  patient_portrait_id: z.string().nullable().optional(),
  provider_id: z.string(),
  patient_id: z.string().optional(),
  patient: z.string().optional(),
  reference: z.string().optional(),
  branch_id: z.string().optional(),
  encounter_id: z.string().nullable(),
  checked_in: z.string(),
  service_start: z.string().nullable().optional(),
  estimate: estimate.nullable(),
  setup_blockers: z
    .array(z.object({ code: z.string(), message: z.string(), action: z.string() }))
    .optional(),
  position: z.number().optional(),
  ahead: z.number().optional(),
});
export type Ticket = z.infer<typeof ticketSchema>;
export const queueSchema = z.object({
  items: z.array(ticketSchema),
  waiting: z.number(),
  in_service: z.number(),
  revision: z.number(),
  updated_at: z.string(),
  truncated: z.boolean(),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
  timezone: z.string(),
});
export const patientOperationsSchema = z.object({
  appointments: z.array(appointmentSchema).optional(),
  tickets: z.array(ticketSchema),
  branch: z.string(),
  waiting: z.number(),
  in_service: z.number(),
  updated_at: z.string(),
  revision: z.number(),
  timezone: z.string(),
});
export function localDate(zone = "Asia/Manila") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
}
export function clock(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: zone,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
