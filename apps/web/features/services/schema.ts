import { z } from "zod";
import { moneyInput } from "@/features/billing/schema";

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  active: z.boolean(),
  version: z.number(),
  workflow: z.array(z.string()),
  branch_ids: z.array(z.string()),
  price: z.string().optional(),
  payment_mode: z.enum(["full", "monthly"]).optional(),
  deposit: z.string().optional(),
  months: z.number().optional(),
});
export type Service = z.infer<typeof serviceSchema>;
export const catalogSchema = z.object({
  items: z.array(serviceSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
  branches: z.array(z.object({ id: z.string(), name: z.string() })),
});
export const caseSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  patient_name: z.string(),
  reference: z.string(),
  branch_id: z.string(),
  service_id: z.string(),
  service_version: z.number(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  version: z.number(),
  invoice_id: z.string().nullable(),
  financial: z
    .object({
      price: z.string(),
      payment_mode: z.string(),
      deposit: z.string(),
      months: z.number(),
    })
    .optional(),
  steps: z.array(
    z.object({ id: z.string(), label: z.string(), status: z.string(), position: z.number() }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      status: z.string(),
      step_id: z.string().nullable(),
      reason: z.string(),
      actor: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type ServiceCase = z.infer<typeof caseSchema>;
export const casesSchema = z.object({
  items: z.array(caseSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
});
export const serviceInput = z
  .object({
    name: z.string().trim().min(1, "Name this service.").max(160),
    category: z.string().max(80),
    description: z.string().max(1200),
    branch_ids: z.array(z.string()).min(1, "Choose at least one branch."),
    active: z.boolean(),
    price: moneyInput,
    workflow: z.array(z.object({ label: z.string().trim().min(1).max(240) })).max(40),
    payment_mode: z.enum(["full", "monthly"]),
    deposit: moneyInput,
    months: z.number().int().min(1).max(60),
  })
  .superRefine((value, ctx) => {
    if (Number(value.price) <= 0)
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a positive price." });
    if (
      value.payment_mode === "monthly" &&
      (Number(value.deposit) >= Number(value.price) ||
        Math.round((Number(value.price) - Number(value.deposit)) * 100) < value.months)
    )
      ctx.addIssue({
        code: "custom",
        path: ["deposit"],
        message: "The down payment must leave a positive amount for every month.",
      });
  });
export type ServiceValues = z.infer<typeof serviceInput>;
