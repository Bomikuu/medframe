import { z } from "zod";

const totals = z.object({
  issued: z.string(),
  payments: z.string(),
  refunds: z.string(),
  net: z.string(),
});
const point = totals.extend({ date: z.string() });
export const financialOverviewSchema = z.object({
  branch_id: z.string(),
  branch: z.string(),
  timezone: z.string(),
  days: z.number(),
  current_from: z.string(),
  current_to: z.string(),
  previous_from: z.string(),
  previous_to: z.string(),
  as_of: z.string(),
  currencies: z.array(
    z.object({
      currency: z.string(),
      current: totals,
      previous: totals,
      series: z.array(point),
      previous_series: z.array(point),
      outstanding: z.string(),
      overdue: z.string(),
      due_now: z.string().default("0.00"),
      future: z.string().default("0.00"),
      unpaid_count: z.number(),
      aging: z.array(z.object({ label: z.string(), amount: z.string() })),
      methods: z.array(z.object({ method: z.string(), amount: z.string() })),
    }),
  ),
});
export type FinancialCurrency = z.infer<typeof financialOverviewSchema>["currencies"][number];
export function money(value: string | number, currency: string, compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(Number(value));
}
