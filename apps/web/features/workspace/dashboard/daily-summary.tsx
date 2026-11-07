"use client";

import { ArrowUpRight, CheckCheck, ClipboardClock, Stethoscope, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyData, VisitFilter } from "./schema";

export function DailySummary({
  data,
  filter,
  select,
  attention,
}: {
  data: DailyData;
  filter: VisitFilter;
  select: (filter: VisitFilter) => void;
  attention: () => void;
}) {
  const cards = [
    {
      id: "waiting",
      label: "Waiting",
      value: data.visits.totals.waiting,
      detail: "Today’s arrivals",
      icon: Users,
      tone: "bg-info-soft text-info",
      visible: data.operations,
      run: () => select("waiting"),
    },
    {
      id: "in_service",
      label: "In consultation",
      value: data.visits.totals.in_service,
      detail: "Today’s active visits",
      icon: Stethoscope,
      tone: "bg-teal-soft text-teal-ink",
      visible: data.operations || data.clinical,
      run: () => select("in_service"),
    },
    {
      id: "completed",
      label: "Completed today",
      value: data.visits.totals.completed,
      detail: "Today’s visits marked complete",
      icon: CheckCheck,
      tone: "bg-success-soft text-success",
      visible: data.operations || data.clinical,
      run: () => select("completed"),
    },
    {
      id: "attention",
      label: "Needs attention",
      value: data.attention.total,
      detail: "Includes earlier unfinished work",
      icon: ClipboardClock,
      tone: "bg-warning-soft text-warning",
      visible: data.clinical,
      run: attention,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards
        .filter((card) => card.visible)
        .map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={card.run}
            aria-pressed={card.id !== "attention" ? filter === card.id : undefined}
            className={cn(
              "group min-w-0 rounded-xl border border-border bg-card p-4 text-left outline-offset-4 transition-colors hover:border-teal-ink/40 hover:bg-teal-soft/20 focus-visible:outline-2 focus-visible:outline-ring sm:p-5",
              filter === card.id && "border-teal-ink bg-teal-soft/20",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className={cn("grid size-9 place-items-center rounded-lg", card.tone)}>
                <card.icon aria-hidden className="size-[18px]" />
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 text-muted-foreground group-hover:text-teal-ink"
              />
            </span>
            <span className="mt-4 block text-sm font-medium text-muted-foreground">
              {card.label}
            </span>
            <strong className="mt-1 block text-3xl leading-tight font-semibold tabular-nums">
              {card.value.toLocaleString()}
            </strong>
            <span className="mt-2 block text-xs leading-5 text-muted-foreground">
              {card.detail}
            </span>
          </button>
        ))}
    </div>
  );
}
