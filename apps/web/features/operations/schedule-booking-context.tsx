"use client";

import { PersonIdentity } from "@/components/application/person-identity";
import { Clock3 } from "lucide-react";
import { StatusBadge } from "@/components/application/status-badge";
import { dayLabel, timeLabel } from "./calendar-dates";
import type { CalendarHours } from "./appointment-calendar";
import type { Appointment, OperationsSetup } from "./schema";

/** Configured hours are context, never a promise of free appointment capacity. */
export function ScheduleBookingContext({
  hours,
  items,
  providers,
  timezone,
  select,
  partial,
}: {
  hours: CalendarHours[];
  items: Appointment[];
  providers: OperationsSetup["providers"];
  timezone: string;
  select: (row: Appointment) => void;
  partial: boolean;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer items-center gap-2 rounded-xl p-4 text-sm font-semibold hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary">
        <Clock3 aria-hidden className="size-4 text-teal-ink" />
        Working hours & booked patients
        <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">
          Expand
        </span>
      </summary>
      <div className="grid max-h-96 gap-3 overflow-y-auto border-t border-border p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          {timezone} · Specific-date closures and overrides are included.{" "}
          {partial
            ? "Booking details cover this page only; more bookings may exist."
            : "No bookings shown does not guarantee a free slot."}
        </p>
        {!hours.length && (
          <p className="text-sm text-muted-foreground">
            No working hours configured for this selection. Existing bookings remain visible in the
            calendar.
          </p>
        )}
        {hours.map((window, index) => {
          const bookings = items.filter(
            (row) =>
              row.provider_id === window.provider_id &&
              row.start < window.end &&
              row.end > window.start,
          );
          return (
            <section
              key={`${window.provider_id}:${window.start}:${index}`}
              className="rounded-lg border border-border p-4"
            >
              <h3 className="text-sm font-semibold">
                <PersonIdentity
                  kind="provider"
                  name={providers.find((row) => row.id === window.provider_id)?.name ?? "Provider"}
                  imageId={providers.find((row) => row.id === window.provider_id)?.photo_id}
                />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {dayLabel(window.date)} · {timeLabel(window.start, timezone)}–
                {timeLabel(window.end, timezone)}
              </p>
              {bookings.length ? (
                <div className="mt-3 grid gap-2">
                  {bookings.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => select(row)}
                      className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="text-sm">
                        <span className="font-semibold tabular-nums">
                          {timeLabel(row.start, timezone)}–{timeLabel(row.end, timezone)}
                        </span>
                        <PersonIdentity
                          kind="patient"
                          name={row.patient ?? "Patient"}
                          imageId={row.patient_portrait_id}
                          className="ml-3"
                        />
                      </span>
                      <StatusBadge value={row.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No bookings shown during these hours.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </details>
  );
}
