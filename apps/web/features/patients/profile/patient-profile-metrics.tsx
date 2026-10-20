"use client";

import { CalendarDays, ClipboardList, Receipt, Route, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicTime } from "@/components/application/clinical-locale";
import { currencyLabel, type ProfileSummary } from "./summary";

export function PatientProfileMetrics({
  summary,
  loading,
  onTab,
}: {
  summary: ProfileSummary | null;
  loading: boolean;
  onTab: (tab: string) => void;
}) {
  const timeLabel = useClinicTime();
  if (!summary)
    return loading ? (
      <div
        role="status"
        aria-label="Loading patient summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    ) : null;
  const cards: {
    label: string;
    value: string;
    detail: string;
    tab: string;
    icon: LucideIcon;
    tone: string;
  }[] = [];
  if (summary.clinical)
    cards.push({
      label: "Total consultations",
      icon: ClipboardList,
      tone: "bg-info-soft text-info",
      value: String(summary.clinical.count),
      detail: summary.clinical.recent[0]
        ? `Last: ${timeLabel(summary.clinical.recent[0].created_at)}`
        : "No consultations recorded",
      tab: "consultations",
    });
  if (summary.operations)
    cards.push({
      label: "Upcoming appointments",
      icon: CalendarDays,
      tone: "bg-teal-soft text-teal-ink",
      value: String(summary.operations.appointment_count),
      detail: summary.operations.upcoming[0]
        ? timeLabel(summary.operations.upcoming[0].start)
        : "No upcoming bookings",
      tab: "overview",
    });
  if (summary.financial) {
    const balances = summary.financial.balances;
    cards.push({
      label: "Total outstanding",
      icon: Receipt,
      tone: "bg-warning-soft text-warning",
      value:
        balances.length === 1
          ? currencyLabel(balances[0].outstanding, balances[0].currency)
          : `${balances.length} currencies`,
      detail:
        balances.length === 1 && balances[0].due_now !== undefined
          ? `${currencyLabel(balances[0].due_now, balances[0].currency)} due through today`
          : `${balances.reduce((count, row) => count + row.unpaid_count, 0)} unpaid invoices`,
      tab: "billing",
    });
  }
  if (summary.operations)
    cards.push({
      label: "Recorded service visits",
      icon: Route,
      tone: "bg-success-soft text-success",
      value: String(summary.operations.visit_count),
      detail: "Across Station departments",
      tab: "overview",
    });
  return (
    <section aria-label="Patient summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Button
          key={card.label}
          variant="ghost"
          onClick={() => onTab(card.tab)}
          className="h-auto min-h-28 min-w-0 flex-col items-start justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-4 text-left whitespace-normal hover:bg-muted/50 sm:px-5"
        >
          <span className="flex w-full min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${card.tone}`}>
              <card.icon aria-hidden className="size-5" />
            </span>
            <span className="max-w-full min-w-0 text-xl font-bold break-words text-foreground tabular-nums sm:text-2xl">
              {card.value}
            </span>
          </span>
          <span className="text-xs font-medium text-foreground sm:text-sm">{card.label}</span>
          <span className="text-xs leading-5 text-muted-foreground">{card.detail}</span>
        </Button>
      ))}
    </section>
  );
}
