import { Camera, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { clinicDate, clinicTime, type GalleryItem } from "./dashboard-client";
import { VisitStatus } from "./visit-status";

export function ConsultationGallery({
  items,
  timezone,
  onPhoto,
  showDate = false,
}: {
  items: GalleryItem[];
  timezone: string;
  onPhoto: (item: GalleryItem) => void;
  showDate?: boolean;
}) {
  const { href, can } = useWorkspace();
  return (
    <ul
      className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3"
      aria-label="Consultation gallery"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-foreground tabular-nums">
                {clinicTime(item.time, timezone)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {showDate && <span className="mr-2">{clinicDate(item.time, timezone)}</span>}
                {item.time_kind === "scheduled"
                  ? "Scheduled"
                  : item.time_kind === "opened"
                    ? "Record opened"
                    : "Checked in"}
              </p>
            </div>
            {item.queue_number !== null && (
              <span className="rounded-lg bg-secondary px-2.5 py-2 text-xs font-semibold tabular-nums">
                Q{String(item.queue_number).padStart(3, "0")}
              </span>
            )}
          </div>
          <div className="relative mb-4 self-start">
            <PatientAvatar
              name={item.patient}
              imageId={item.portrait_id ?? undefined}
              className="size-20 text-xl"
            />
            {can("documents.write") && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -right-2 -bottom-1 size-11 rounded-full bg-card"
                onClick={() => onPhoto(item)}
                aria-label={`Change photo for ${item.patient}`}
              >
                <Camera className="size-4" />
              </Button>
            )}
          </div>
          <h3 className="text-lg leading-7 font-semibold wrap-anywhere">{item.patient}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{item.reference}</p>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.reason || "Reason not recorded"}
          </p>
          <div className="my-4">
            <VisitStatus item={item} />
          </div>
          {item.resource && <p className="mb-4 text-xs text-muted-foreground">{item.resource}</p>}
          <ButtonLink
            variant="outline"
            className="mt-auto min-h-11 w-full justify-between text-left whitespace-normal"
            href={href(
              item.encounter_id
                ? `/station/clinician/consultations/${item.encounter_id}`
                : `/station/clinician/patients/${item.patient_id}`,
            )}
          >
            {item.encounter_id ? "Open consultation" : "Open patient"}
            <ArrowUpRight className="shrink-0" />
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}
