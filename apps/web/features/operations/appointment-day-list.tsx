"use client";

import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PersonIdentity } from "@/components/application/person-identity";
import { StatusBadge } from "@/components/application/status-badge";
import { dayLabel, timeLabel } from "./calendar-dates";
import type { Appointment } from "./schema";

/** The day grows inside this scroll area, never inside the month grid. */
export function AppointmentDayList({
  day,
  timezone,
  count,
  items,
  close,
  select,
  notice,
  footer,
  stale = false,
}: {
  day: string;
  timezone: string;
  count?: number;
  items: Appointment[];
  close: () => void;
  select: (row: Appointment) => void;
  notice?: ReactNode;
  footer?: ReactNode;
  stale?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 border-b border-border p-5 pr-12 sm:p-6 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays aria-hidden className="size-5 shrink-0 text-teal-ink" />
            {dayLabel(day)}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {count === undefined ? "Appointments" : `${count} appointment${count === 1 ? "" : "s"}`}{" "}
            matching your calendar filters · {timezone}. Select a booking for details and available
            actions.
          </DialogDescription>
        </div>
        <div
          className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6"
          aria-label="Day appointments"
        >
          {notice}
          {!items.length && !notice && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No appointments match your filters for this day.
            </p>
          )}
          <ul className="grid min-w-0 gap-3">
            {[...items]
              .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
              .map((row) => (
                <li key={row.id} className="min-w-0">
                  <button
                    type="button"
                    disabled={stale}
                    onClick={() => select(row)}
                    className="grid w-full min-w-0 gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
                        <Clock3 aria-hidden className="size-4 text-muted-foreground" />
                        {row.online_timing_mode === "instant"
                          ? `Instant · created ${timeLabel(row.start, timezone)}`
                          : `${timeLabel(row.start, timezone)}–${timeLabel(row.end, timezone)}`}
                      </span>
                      <StatusBadge value={row.status} />
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid min-w-0 flex-1 gap-2 text-sm">
                        <PersonIdentity
                          kind="patient"
                          name={row.patient}
                          imageId={row.patient_portrait_id}
                          className="font-semibold"
                        />
                        <PersonIdentity
                          kind="provider"
                          name={row.provider}
                          imageId={row.provider_photo_id}
                          className="text-muted-foreground"
                        />
                      </span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.reference ? `${row.reference} · ` : ""}
                      {row.resource ?? "No room reserved"}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
          {footer}
          <Button type="button" variant="outline" onClick={close} className="ml-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
