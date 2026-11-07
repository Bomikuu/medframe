import { z } from "zod";

const person = {
  patient_id: z.string(),
  patient: z.string(),
  patient_portrait_id: z.string().nullable().optional(),
};
const provider = {
  provider_id: z.string(),
  provider: z.string(),
  provider_photo_id: z.string().nullable().optional(),
};
const task = z.object({
  ...person,
  id: z.string(),
  kind: z.enum(["note", "result", "follow_up"]),
  title: z.string(),
  at: z.string(),
  responsible: z.string(),
  overdue: z.boolean(),
  urgent: z.boolean().optional(),
});
export const dailySchema = z.object({
  date: z.string(),
  timezone: z.string(),
  updated_at: z.string(),
  operations: z.boolean(),
  clinical: z.boolean(),
  visits: z.object({
    totals: z.object({
      all: z.number(),
      waiting: z.number(),
      in_service: z.number(),
      completed: z.number(),
      scheduled: z.number(),
    }),
    total: z.number(),
    page: z.number(),
    items: z.array(
      z.object({
        ...person,
        ...provider,
        id: z.string(),
        kind: z.enum(["queue", "appointment", "encounter"]),
        at: z.string(),
        reference: z.string(),
        status: z.string(),
        group: z.string(),
        visit_type: z.string(),
        encounter_id: z.string().nullable(),
        appointment_id: z.string().nullable(),
        waiting_since: z.string().nullable(),
      }),
    ),
  }),
  attention: z.object({
    totals: z.object({
      notes: z.number(),
      follow_ups: z.number(),
      results: z.number(),
      orders: z.number(),
    }),
    total: z.number(),
    page: z.number(),
    items: z.array(task),
    unfinished: z.array(
      z.object({
        ...person,
        ...provider,
        id: z.string(),
        status: z.string(),
        at: z.string(),
        mine: z.boolean(),
        specialty: z.string().optional(),
      }),
    ),
    orders: z.array(
      z.object({
        ...person,
        id: z.string(),
        title: z.string(),
        status: z.string(),
        at: z.string(),
      }),
    ),
  }),
  providers: z.array(
    z.object({
      ...provider,
      specialty: z.string(),
      hours: z.array(z.object({ opens: z.string(), closes: z.string() })),
    }),
  ),
  finance: z
    .array(
      z.object({
        currency: z.string(),
        collected: z.string(),
        outstanding: z.string(),
        overdue: z.string(),
      }),
    )
    .nullable(),
});
export type DailyData = z.infer<typeof dailySchema>;
export type DailyTask = z.infer<typeof task>;
export type VisitFilter = "all" | "waiting" | "in_service" | "completed";
