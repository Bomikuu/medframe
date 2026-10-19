import { Clock3, CalendarClock } from "lucide-react";
import type { GalleryItem } from "./dashboard-client";
const labels: Record<string, string> = {
  booked: "Scheduled",
  checked_in: "Checked in",
  waiting: "In queue",
  called: "Called",
  in_service: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
  draft: "Draft",
  in_progress: "In progress",
  finalized: "Finalized",
  amended: "Amended",
};
export function VisitStatus({ item, compact = false }: { item: GalleryItem; compact?: boolean }) {
  const active = ["in_service", "called", "in_progress"].includes(item.status);
  const warning = ["cancelled", "no_show"].includes(item.status);
  const { kind, minutes, delay } = item.timing;
  const timing =
    minutes > 0
      ? kind === "awaiting_arrival"
        ? `${minutes} min past scheduled time · awaiting arrival`
        : kind === "late_arrival"
          ? `Arrived ${minutes} min late`
          : kind === "started_late"
            ? `Started ${minutes} min late`
            : null
      : null;
  return (
    <div className="grid min-w-0 gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex min-h-7 items-center rounded-md px-2.5 font-medium ${active ? "bg-teal-wash text-teal-ink" : warning ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}
        >
          {labels[item.status] ?? item.status.replaceAll("_", " ")}
        </span>
        {item.clinical_status && item.clinical_status !== item.status && !compact && (
          <span className="text-muted-foreground">
            Record: {labels[item.clinical_status] ?? item.clinical_status}
          </span>
        )}
      </div>
      {delay > 0 && (
        <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
          <Clock3 className="size-3.5 shrink-0" />
          Delayed · +{delay} min
        </span>
      )}
      {timing && <span className="leading-5 text-amber-800 dark:text-amber-200">{timing}</span>}
      {item.rescheduled_at && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          Rescheduled
        </span>
      )}
    </div>
  );
}
