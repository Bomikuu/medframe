export type InvoiceFilters = Record<string, string>;
export const balanceChoices = [
  { value: "all", label: "All balances" },
  { value: "outstanding", label: "Total outstanding" },
  { value: "due", label: "Due through today" },
  { value: "overdue", label: "Overdue payments" },
  { value: "future", label: "Future payments" },
];

export function invoiceLinkFilters(params: {
  get: (key: string) => string | null;
}): InvoiceFilters {
  const result: InvoiceFilters = {};
  const status = params.get("status");
  const balance = params.get("balance");
  const basis = params.get("date_basis");
  if (
    status &&
    ["draft", "issued", "unpaid", "partial", "paid", "refund_due", "void"].includes(status)
  )
    result.status = status;
  if (balance && balanceChoices.some((row) => row.value === balance && balance !== "all"))
    result.balance = balance;
  if (basis === "issued") result.date_basis = basis;
  const query = params.get("query");
  if (query) result.query = query.slice(0, 160);
  for (const key of ["date_from", "date_to"]) {
    const day = params.get(key);
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) result[key] = day;
  }
  const currency = params.get("currency");
  if (currency && /^[A-Z]{3}$/.test(currency)) result.currency = currency;
  return result;
}

/** base is already scoped by the workspace; report dates never become balance dates. */
export function invoiceListHref(
  base: string,
  filters: InvoiceFilters,
  report?: { from: string; to: string },
) {
  const [path, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (report) {
    params.set("report_from", report.from);
    params.set("report_to", report.to);
  }
  return `${path}?${params.toString()}#invoices`;
}
