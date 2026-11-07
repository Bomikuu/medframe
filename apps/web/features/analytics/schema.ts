import { z } from "zod";

const group = z.object({ label: z.string(), count: z.number().int().nonnegative() });
export const metricSchema = z.object({
  current: z.number().int().nonnegative(),
  previous: z.number().int().nonnegative(),
  statuses: z.array(group),
  series: z.array(z.object({ date: z.string(), count: z.number().int().nonnegative() })),
  previous_series: z.array(z.object({ date: z.string(), count: z.number().int().nonnegative() })),
  distinct_current: z.number().optional(),
  distinct_previous: z.number().optional(),
});
export type Metric = z.infer<typeof metricSchema>;
export const insightsSchema = z.object({
  branch_id: z.string(),
  branch: z.string(),
  timezone: z.string(),
  days: z.number(),
  current_from: z.string(),
  current_to: z.string(),
  previous_from: z.string(),
  previous_to: z.string(),
  as_of: z.string(),
  patients: z
    .object({ total: z.number().int().nonnegative(), registrations: metricSchema })
    .nullable(),
  operations: z.object({ appointments: metricSchema, queue: metricSchema }).nullable(),
  clinical: z.object({ encounters: metricSchema, specialties: z.array(group) }).nullable(),
});
