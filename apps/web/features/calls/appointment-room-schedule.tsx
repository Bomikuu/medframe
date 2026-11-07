import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { callDate } from "./call-format";

export function AppointmentScheduleSummary({
  start,
  timezone = "Asia/Manila",
}: {
  start: string;
  timezone?: string;
}) {
  const opens = new Date(Date.parse(start) - 10 * 60 * 1000).toISOString();
  return (
    <section aria-label="Appointment schedule" className="grid gap-3">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-soft text-teal-ink">
          <CalendarDays aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm text-muted-foreground">Scheduled for</h3>
          <p className="mt-1 text-base leading-6 font-semibold">{callDate(start, timezone)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{timezone}</p>
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Clock3 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          The room opens on {callDate(opens, timezone)}, ten minutes before your appointment.
        </span>
      </p>
    </section>
  );
}

export function AppointmentRescheduleLink({ roomId }: { roomId: string }) {
  return (
    <div className="grid gap-1.5 text-center">
      <p className="text-xs text-muted-foreground">Need to change the time?</p>
      <Link
        href={`/portal/appointments?room=${encodeURIComponent(roomId)}&reschedule=1`}
        className="mx-auto rounded text-sm font-medium text-teal-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Request reschedule
      </Link>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Sign in to choose a new time. Your booking stays in place until you confirm a change.
      </p>
    </div>
  );
}

export function AppointmentRoomSchedule({
  start,
  timezone,
  roomId,
}: {
  start: string;
  timezone?: string;
  roomId: string;
}) {
  return (
    <div className="grid gap-5 rounded-xl border border-border p-5">
      <AppointmentScheduleSummary start={start} timezone={timezone} />
      <AppointmentRescheduleLink roomId={roomId} />
    </div>
  );
}
