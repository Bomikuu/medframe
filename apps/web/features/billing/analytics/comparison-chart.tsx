"use client";

import { PeriodComparisonChart } from "@/features/analytics/period-comparison-chart";
import { money, type FinancialCurrency } from "./schema";

export function ComparisonChart({ value }: { value: FinancialCurrency }) {
  return (
    <PeriodComparisonChart
      title="Net recorded payments"
      current={value.series.map((row) => ({ date: row.date, value: Number(row.net) }))}
      previous={value.previous_series.map((row) => ({ date: row.date, value: Number(row.net) }))}
      formatValue={(amount) => money(amount, value.currency)}
      formatAxis={(amount) => money(amount, value.currency, true)}
    />
  );
}
