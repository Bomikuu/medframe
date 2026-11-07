"use client";

import { PersonAvatar } from "@/components/application/person-identity";

import { CalendarDays, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Appointment } from "./schema";
import { calendarDay, dayLabel, minutes, timeLabel } from "./calendar-dates";

export type CalendarHours = { provider_id: string; date: string; start: string; end: string };

// Space short visits for touch targets and place simultaneous visits in separate lanes.
function arrange(rows: Appointment[], zone: string) {
  const lanes: number[] = [];
  const placed = [...rows]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((row) => {
      const start = minutes(row.start, zone);
      const end =
        calendarDay(row.end, zone) === calendarDay(row.start, zone) ? minutes(row.end, zone) : 1440;
      let lane = lanes.findIndex((until) => until <= start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = Math.max(end, start + 28);
      return { row, start, end, lane };
    });
  return { placed, count: Math.max(1, lanes.length) };
}

export function AppointmentCalendar({
  days,
  items,
  hours,
  timezone,
  today,
  select,
}: {
  days: string[];
  items: Appointment[];
  hours: CalendarHours[];
  timezone: string;
  today: string;
  select: (row: Appointment) => void;
}) {
  const points = [
    ...items.map((row) => minutes(row.start, timezone)),
    ...hours.map((row) => minutes(row.start, timezone)),
  ];
  const ends = [
    ...items.map((row) =>
      calendarDay(row.end, timezone) === calendarDay(row.start, timezone)
        ? minutes(row.end, timezone)
        : 1440,
    ),
    ...hours.map((row) => minutes(row.end, timezone)),
  ];
  const from = Math.floor(Math.min(480, ...points) / 60) * 60;
  const to = Math.min(1440, Math.ceil(Math.max(1080, ...ends) / 60) * 60);
  const height = (to - from) * 2;
  const ticks = Array.from({ length: (to - from) / 60 }, (_, index) => from + index * 60);
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded bg-teal-100 ring-1 ring-teal-600/30" />
          Configured working hours
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded bg-blue-100 ring-1 ring-blue-600/30" />
          Booked
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded bg-teal-600" />
          In service
        </span>
      </div>
      <div
        className="max-h-[70dvh] overflow-auto"
        tabIndex={0}
        aria-label="Appointment calendar. Scroll to see other times and days."
      >
        <div style={{ minWidth: days.length > 1 ? 1150 : 300 }}>
          <div
            className="sticky top-0 z-20 grid border-b border-border bg-card"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className="flex items-center justify-center text-muted-foreground">
              <Clock3 aria-hidden className="size-4" />
            </div>
            {days.map((day) => (
              <div
                key={day}
                className={cn(
                  "border-l border-border px-3 py-4 text-sm font-semibold",
                  day === today && "bg-teal-50 text-teal-ink",
                )}
              >
                {dayLabel(day)}
                {day === today && <span className="mt-1 block text-xs font-normal">Today</span>}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className="relative bg-muted/30" style={{ height }}>
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute right-2 pt-1 text-xs text-muted-foreground tabular-nums"
                  style={{ top: (tick - from) * 2 }}
                >
                  {String(Math.floor(tick / 60)).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((day) => {
              const rows = items.filter((row) => calendarDay(row.start, timezone) === day);
              const { placed, count } = arrange(rows, timezone);
              const working = hours.filter((row) => row.date === day);
              return (
                <div key={day} className="relative border-l border-border" style={{ height }}>
                  {working.map((window, index) => (
                    <div
                      key={`${window.provider_id}-${index}`}
                      className="pointer-events-none absolute inset-x-0 bg-teal-500/5"
                      style={{
                        top: (minutes(window.start, timezone) - from) * 2,
                        height:
                          (minutes(window.end, timezone) - minutes(window.start, timezone)) * 2,
                      }}
                    />
                  ))}
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                      style={{ top: (tick - from) * 2 }}
                    />
                  ))}
                  {!rows.length && (
                    <p className="absolute inset-x-2 top-8 text-center text-xs text-muted-foreground">
                      No bookings shown
                    </p>
                  )}
                  {placed.map(({ row, start, end, lane }) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => select(row)}
                      aria-label={`${row.patient}, ${timeLabel(row.start, timezone)} to ${timeLabel(row.end, timezone)}, ${row.provider}, ${row.status.replaceAll("_", " ")}`}
                      title={`${row.patient} · ${timeLabel(row.start, timezone)}–${timeLabel(row.end, timezone)} · ${row.provider} · ${row.status.replaceAll("_", " ")}`}
                      className={cn(
                        "absolute overflow-hidden rounded-lg border p-2 text-left text-xs shadow-sm transition-colors hover:ring-2 hover:ring-primary/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        row.status === "in_service"
                          ? "border-teal-700 bg-teal-700 text-white"
                          : ["cancelled", "no_show"].includes(row.status)
                            ? "border-border bg-muted text-muted-foreground"
                            : row.status === "completed"
                              ? "border-border bg-card text-foreground"
                              : "border-blue-200 bg-blue-50 text-blue-950",
                      )}
                      style={{
                        top: (start - from) * 2 + 2,
                        height: Math.max(52, (end - start) * 2 - 4),
                        left: `calc(${(lane / count) * 100}% + 3px)`,
                        width: `calc(${100 / count}% - 6px)`,
                      }}
                    >
                      <span className="block truncate font-semibold tabular-nums">
                        {row.online_timing_mode === "instant"
                          ? "Instant consultation"
                          : `${timeLabel(row.start, timezone)}–${timeLabel(row.end, timezone)}`}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <PersonAvatar
                          kind="patient"
                          name={row.patient ?? "Patient"}
                          imageId={row.patient_portrait_id}
                          className="size-5 text-[9px]"
                        />
                        <PersonAvatar
                          kind="provider"
                          name={row.provider}
                          imageId={row.provider_photo_id}
                          className="size-5 text-[9px]"
                        />
                        <span className="truncate font-semibold">{row.patient}</span>
                      </span>
                      {end - start >= 45 && (
                        <span className="block truncate opacity-85">{row.provider}</span>
                      )}
                      {end - start >= 60 && (
                        <span className="block truncate capitalize">
                          {row.status.replaceAll("_", " ")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="flex items-start gap-2 border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
        <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0" />
        Working hours are schedule windows. Booking checks the latest provider, patient and room
        availability.
      </p>
    </div>
  );
}
