import { z } from "zod";
import { dueSchema, agreementSchema, installmentDraftSchema } from "./installment-schema";

export const moneyInput = z
  .string()
  .regex(/^\d{1,7}(?:\.\d{1,2})?$/, "Use an amount up to 9,999,999.99 with at most two decimals.");
export const lineInput = z.object({
  description: z.string().trim().min(1, "Describe this charge.").max(240),
  kind: z.enum(["consultation", "procedure", "other"]),
  quantity: z.number().int().min(1).max(999),
  unit_amount: moneyInput,
  service_id: z.string().optional(),
  service_case_id: z.string().nullable().optional(),
  service_version: z.number().optional(),
  override_reason: z.string().max(500).optional(),
});
export const draftInput = z.object({
  patient_id: z.string().uuid("Choose a patient."),
  due_date: z.string().min(1, "Choose a due date."),
  discount_kind: z.enum(["fixed", "percent"]),
  discount_value: moneyInput,
  lines: z.array(lineInput).min(1).max(100),
  installment: installmentDraftSchema.nullable().optional(),
  case_id: z.string().nullable().optional(),
});
export type DraftValues = z.infer<typeof draftInput>;
export const setupSchema = z.object({
  branch_id: z.string(),
  currency: z.string(),
  timezone: z.string(),
  branches: z.array(z.object({ id: z.string(), name: z.string() })),
  patients: z.array(z.object({ id: z.string(), name: z.string(), reference: z.string() })),
  permissions: z.array(z.string()),
});
export type BillingSetup = z.infer<typeof setupSchema>;
export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  state: z.string(),
  currency: z.string(),
  patient_id: z.string(),
  patient_name: z.string(),
  reference: z.string(),
  branch_id: z.string(),
  branch_name: z.string(),
  due_date: z.string(),
  version: z.number(),
  created_at: z.string(),
  issued_at: z.string().nullable(),
  subtotal: z.string(),
  discount: z.string(),
  total: z.string(),
  credits: z.string(),
  paid: z.string(),
  refunded: z.string(),
  net_received: z.string(),
  outstanding: z.string(),
  refundable: z.string(),
  payment_status: z.string(),
  due: dueSchema.optional(),
});
export const invoiceDetailSchema = invoiceSchema.extend({
  installment_plan: agreementSchema.nullable().optional(),
  case_id: z.string().nullable().optional(),
  discount_kind: z.enum(["fixed", "percent"]),
  discount_value: z.string(),
  lines: z.array(lineInput.extend({ line_total: z.string() })),
  payments: z.array(
    z.object({
      id: z.string(),
      amount: z.string(),
      method: z.string(),
      paid_date: z.string(),
      refundable: z.string(),
      reference: z.string().optional(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      created_at: z.string(),
      amount: z.string(),
      reason: z.string().optional(),
      actor: z.string().optional(),
    }),
  ),
});
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;
export const invoicePageSchema = z.object({
  items: z.array(invoiceSchema),
  end_cursor: z.string().nullable(),
  has_next_page: z.boolean(),
  summary: z
    .object({ outstanding: z.string(), net_received: z.string(), refundable: z.string() })
    .optional(),
});
export const previewSchema = z.object({
  subtotal: z.string(),
  discount: z.string(),
  total: z.string(),
});
export function currency(value: string, code = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: code }).format(
    Number(value),
  );
}
