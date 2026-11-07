"use client";

import { PersonAvatar } from "@/components/application/person-identity";

import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayLabel, calendarDay, timeLabel } from "./calendar-dates";
import type { Appointment } from "./schema";

export function AppointmentMonth({
  days,
  month,
  today,
  items,
  counts,
  timezone,
  select,
  openDay,
}: {
  days: string[];
  month: string;
  today: string;
  items: Appointment[];
  counts: { date: string; count: number }[];
  timezone: string;
  select: (row: Appointment) => void;
  openDay: (day: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto" tabIndex={0} aria-label="Month appointment calendar">
        <div className="min-w-[850px]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
              (name) => (
                <div key={name} className="p-3 text-center text-xs font-semibold">
                  {name}
                </div>
              ),
            )}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const rows = items.filter((row) => calendarDay(row.start, timezone) === day);
              const count = counts.find((row) => row.date === day)?.count ?? 0;
              return (
                <section
                  key={day}
                  className={cn(
                    "flex h-44 min-w-0 flex-col overflow-hidden border-r border-b border-border p-2",
                    day.slice(0, 7) !== month.slice(0, 7) && "bg-muted/35",
                    day === today && "bg-teal-50/60",
                  )}
                  aria-label={dayLabel(day)}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      className={cn(
                        "grid size-11 place-items-center rounded-full text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
                        day === today && "bg-primary text-primary-foreground",
                      )}
                      aria-label={`Open ${dayLabel(day)}`}
                      onClick={() => openDay(day)}
                    >
                      {Number(day.slice(-2))}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded px-1 py-2 text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`${count} appointments on ${dayLabel(day)}`}
                      onClick={() => openDay(day)}
                    >
                      {count ? `${count} visits` : "No bookings"}
                    </button>
                  </div>
                  <div className="grid min-h-0 gap-1.5">
                    {rows.slice(0, 1).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => select(row)}
                        className={cn(
                          "grid h-14 min-w-0 content-center gap-1 overflow-hidden rounded-md border border-blue-200 bg-blue-50 p-2 text-left text-xs text-blue-950 hover:ring-2 hover:ring-primary/30 focus-visible:outline-2 focus-visible:outline-primary",
                          row.status === "in_service" && "border-teal-700 bg-teal-700 text-white",
                          ["cancelled", "no_show"].includes(row.status) &&
                            "border-border bg-muted text-muted-foreground",
                        )}
                        title={`${row.patient} · ${row.online_timing_mode === "instant" ? "Instant consultation" : timeLabel(row.start, timezone)}–${timeLabel(row.end, timezone)} · ${row.provider} · ${row.status.replaceAll("_", " ")}`}
                      >
                        <span className="font-semibold tabular-nums">
                          {row.online_timing_mode === "instant"
                            ? "Instant consultation"
                            : timeLabel(row.start, timezone)}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <PersonAvatar
                            kind="patient"
                            name={row.patient}
                            imageId={row.patient_portrait_id}
                            className="size-5 text-[9px]"
                          />
                          <PersonAvatar
                            kind="provider"
                            name={row.provider}
                            imageId={row.provider_photo_id}
                            className="size-5 text-[9px]"
                          />
                          <span className="truncate font-medium">{row.patient}</span>
                        </span>
                      </button>
                    ))}
                    {count > 1 && (
                      <button
                        type="button"
                        onClick={() => openDay(day)}
                        className="flex min-h-11 items-center gap-1 rounded text-left text-[11px] font-medium text-teal-ink hover:underline"
                      >
                        <List aria-hidden className="size-3 shrink-0" />
                        View all {count}
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
