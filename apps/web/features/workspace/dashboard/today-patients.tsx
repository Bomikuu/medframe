"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PersonIdentity } from "@/components/application/person-identity";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/application/empty-state";
import { useWorkspace } from "../workspace-provider";
import { cn } from "@/lib/utils";
import type { DailyData, VisitFilter } from "./schema";

export function shortClock(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
const choices: { value: VisitFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "in_service", label: "In consultation" },
  { value: "completed", label: "Completed" },
];

export function TodayPatients({
  data,
  filter,
  select,
  page,
  setPage,
  expand,
  expanded = false,
  appointment,
}: {
  data: DailyData;
  filter: VisitFilter;
  select: (value: VisitFilter) => void;
  page: number;
  setPage: (page: number) => void;
  expand?: () => void;
  expanded?: boolean;
  appointment: (id: string, patientId: string) => void;
}) {
  const { href, can } = useWorkspace();
  return (
    <section
      aria-labelledby={expanded ? "today-patients-all" : "today-patients-title"}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl bg-card",
        !expanded && "border border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2
            id={expanded ? "today-patients-all" : "today-patients-title"}
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <CalendarDays aria-hidden className="size-5 text-teal-ink" />
            Today’s patients
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.visits.totals.all} permitted visits today
          </p>
        </div>
        {expand && (
          <Button type="button" variant="ghost" size="sm" onClick={expand}>
            View all
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        )}
      </div>
      <div
        className="flex min-w-0 gap-1 overflow-x-auto px-5 pt-4 pb-3 sm:px-6"
        aria-label="Today’s patient filters"
      >
        {choices
          .filter((item) => item.value !== "waiting" || data.operations)
          .map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => select(item.value)}
              className={cn(
                "min-h-11 shrink-0 rounded-lg px-3 text-xs font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-10",
                filter === item.value
                  ? "bg-teal-soft text-teal-ink"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
              <span className="ml-2 tabular-nums">{data.visits.totals[item.value]}</span>
            </button>
          ))}
      </div>
      {data.visits.items.length ? (
        <>
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_100px] gap-4 bg-muted/60 px-6 py-3 text-[11px] font-medium text-muted-foreground md:grid">
            <span>Patient & visit</span>
            <span>Assigned provider</span>
            <span>Time</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-border px-5 sm:px-6">
            {data.visits.items.map((row) => {
              const encounter = row.encounter_id && can("patients.clinical.read");
              const target = encounter
                ? href(`/clinic/consultations/${row.encounter_id}`)
                : row.kind === "appointment"
                  ? `${href("/clinic/appointments")}&patient=${row.patient_id}`
                  : row.kind === "queue"
                    ? row.status === "completed"
                      ? href(`/clinic/patients/${row.patient_id}`)
                      : href("/clinic/queue")
                    : href(`/clinic/patients/${row.patient_id}`);
              const action = encounter
                ? row.status === "completed" || row.status === "finalized"
                  ? "View encounter"
                  : can("encounters.write")
                    ? "Resume consultation"
                    : "View encounter"
                : row.kind === "appointment" && row.status === "booked" && can("queues.manage")
                  ? "Review check-in"
                  : row.kind === "queue" && row.status === "completed"
                    ? "Patient record"
                    : row.kind === "queue" && can("encounters.write")
                      ? "Open queue"
                      : "View visit";
              const waiting = row.waiting_since
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.parse(data.updated_at) - Date.parse(row.waiting_since)) / 60000,
                    ),
                  )
                : null;
              return (
                <li key={`${row.kind}:${row.id}`} className="grid min-w-0 gap-3 py-4">
                  <div className="grid min-w-0 items-center gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_100px] md:gap-4">
                    <div className="min-w-0">
                      <PersonIdentity
                        kind="patient"
                        name={row.patient}
                        imageId={row.patient_portrait_id}
                        className="max-w-full text-sm font-semibold"
                      />
                      <p className="mt-1 pl-9 text-[11px] text-muted-foreground">
                        {row.reference}
                        <span className="mx-1.5">/</span>
                        {row.visit_type}
                      </p>
                    </div>
                    <PersonIdentity
                      kind="provider"
                      name={row.provider}
                      imageId={row.provider_photo_id}
                      className="max-w-full text-xs text-muted-foreground"
                    />
                    <time dateTime={row.at} className="text-xs font-medium tabular-nums">
                      {shortClock(row.at, data.timezone)}
                    </time>
                    <StatusBadge value={row.status} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 md:pl-9">
                    <span className="text-[11px] text-muted-foreground">
                      {waiting !== null
                        ? `${waiting} min since arrival`
                        : row.kind === "appointment"
                          ? "Scheduled appointment"
                          : row.visit_type}
                    </span>
                    {row.kind === "appointment" ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-teal-ink hover:underline sm:min-h-8"
                        onClick={() => appointment(row.id, row.patient_id)}
                      >
                        {action}
                        <ArrowRight aria-hidden className="size-3.5" />
                      </button>
                    ) : (
                      <Link
                        className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-teal-ink hover:underline sm:min-h-8"
                        href={target}
                      >
                        {action}
                        <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="px-5 pb-5">
          <EmptyState
            title={filter === "all" ? "No visits today" : "No matching visits"}
            description={
              filter === "all"
                ? "Bookings, arrivals and consultations will appear here as your clinic’s day begins."
                : "Choose another filter to review today’s other visits."
            }
          />
        </div>
      )}
      {expanded && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
          <span>
            Page {page} · {data.visits.total} visits
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 8 >= data.visits.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
