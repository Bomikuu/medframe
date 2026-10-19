import { ArrowUpRight, CalendarDays, ListOrdered } from "lucide-react";
import Link from "next/link";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { clinicDate, clinicTime, type GalleryItem } from "./dashboard-client";
import { VisitStatus } from "./visit-status";
export function UpcomingCare({
  items,
  timezone,
  truncated,
  available,
}: {
  items: GalleryItem[];
  timezone: string;
  truncated: boolean;
  available: boolean;
}) {
  const { href } = useWorkspace();
  return (
    <aside
      className="min-w-0 self-start rounded-2xl border border-border bg-card px-5 py-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto"
      aria-label="Upcoming care"
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Up next</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your queue & scheduled patients
          </p>
        </div>
        <CalendarDays className="mt-1 size-5 text-muted-foreground" />
      </header>
      {!available ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Schedule access is not available for this membership.
        </p>
      ) : !items.length ? (
        <div className="py-8">
          <ListOrdered className="mb-4 size-7 text-muted-foreground" />
          <p className="font-medium">Nothing waiting</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No permitted active queues or upcoming appointments in the next seven days.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-5 first:pt-0 last:pb-0">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold tabular-nums">
                  {clinicTime(item.time, timezone)}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {clinicDate(item.time, timezone)}
                  </span>
                </span>
                {item.queue_number !== null && (
                  <span className="font-medium">Q{String(item.queue_number).padStart(3, "0")}</span>
                )}
              </div>
              <Link
                href={href(
                  item.encounter_id
                    ? `/station/clinician/consultations/${item.encounter_id}`
                    : `/station/clinician/patients/${item.patient_id}`,
                )}
                className="mb-3 flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <PatientAvatar
                  name={item.patient}
                  imageId={item.portrait_id ?? undefined}
                  className="size-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold wrap-anywhere">{item.patient}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.resource || item.reference}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <VisitStatus item={item} compact />
            </li>
          ))}
        </ol>
      )}
      {truncated && (
        <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          Showing the first upcoming records. Refresh as care progresses.
        </p>
      )}
    </aside>
  );
}
