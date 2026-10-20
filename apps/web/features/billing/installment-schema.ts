import { z } from "zod";

export const obligationSchema = z.object({
  id: z.string(),
  position: z.number(),
  kind: z.string(),
  due_date: z.string(),
  original: z.string(),
  credited: z.string(),
  effective: z.string(),
  covered: z.string(),
  remaining: z.string(),
  date_state: z.string(),
  coverage_state: z.string(),
});
export const dueSchema = z.object({
  total: z.string(),
  credits: z.string(),
  net_received: z.string(),
  outstanding: z.string(),
  refundable: z.string(),
  due_now: z.string(),
  overdue: z.string(),
  future: z.string(),
  next_due: obligationSchema.nullable(),
  is_installment: z.boolean(),
  rows: z.array(obligationSchema),
});
export type Due = z.infer<typeof dueSchema>;
export const agreementSchema = z.object({
  digest: z.string(),
  confirmed: z.boolean(),
  terms: z.object({
    case_id: z.string(),
    deposit: z.string(),
    months: z.number(),
    deposit_due: z.string().nullable(),
    first_due: z.string(),
  }),
  source: z.object({ name: z.string() }).passthrough().optional(),
});
export const installmentDraftSchema = z.object({
  case_id: z.string(),
  deposit: z.string().regex(/^\d{1,7}(?:\.\d{1,2})?$/, "Use an amount with at most two decimals."),
  months: z.number().int().min(1).max(60),
  deposit_due: z.string().nullable(),
  first_due: z.string().min(1, "Choose the first monthly date."),
});
