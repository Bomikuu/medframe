"use client";

import { CalendarDays, ClipboardList } from "lucide-react";
import { ProfileClinicalContext } from "./patient-clinical-context";
import { ButtonLink } from "@/components/ui/button-link";
import { StatusBadge } from "@/components/application/status-badge";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { ProfileSummary } from "./summary";

export function PatientProfileSidebar({
  patientId,
  summary,
  onTab,
  showContext = true,
}: {
  patientId: string;
  summary: ProfileSummary | null;
  onTab: (tab: string) => void;
  showContext?: boolean;
}) {
  const { href } = useWorkspace();
  const timeLabel = useClinicTime();
  if (!summary) return null;
  return (
    <aside aria-label="Patient context and activity" className="grid min-w-0 gap-4">
      {summary.clinical && showContext && (
        <ProfileClinicalContext patientId={patientId} onReview={() => onTab("medical")} />
      )}
      {summary.clinical && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList aria-hidden className="size-4 text-info" />
              Recent consultations
            </h2>
            <button
              type="button"
              onClick={() => onTab("consultations")}
              className="min-h-9 text-xs font-medium text-teal-ink underline-offset-4 hover:underline"
            >
              Review notes
            </button>
          </div>
          <ul className="divide-y divide-border/60">
            {summary.clinical.recent.slice(0, 3).map((row) => (
              <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                <ButtonLink
                  variant="link"
                  className="h-auto max-w-full justify-start p-0 text-left text-sm whitespace-normal"
                  href={href(`/clinic/consultations/${row.id}`)}
                >
                  {row.reason}
                </ButtonLink>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {timeLabel(row.created_at)}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.provider_name}</p>
                <div className="mt-2">
                  <StatusBadge value={row.status} />
                </div>
              </li>
            ))}
          </ul>
          {!summary.clinical.recent.length && (
            <p className="text-sm leading-6 text-muted-foreground">
              No consultations recorded yet.
            </p>
          )}
        </section>
      )}
      {summary.operations && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <CalendarDays aria-hidden className="size-4 text-teal-ink" />
            Upcoming appointments
          </h2>
          <ul className="divide-y divide-border/60">
            {summary.operations.upcoming.map((row) => (
              <li key={row.id} className="py-3 first:pt-0">
                <p className="text-sm font-medium">{timeLabel(row.start)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.provider}</p>
                <div className="mt-2">
                  <StatusBadge value={row.status} />
                </div>
              </li>
            ))}
          </ul>
          {!summary.operations.upcoming.length && (
            <p className="text-sm leading-6 text-muted-foreground">No upcoming bookings.</p>
          )}
          <ButtonLink
            href={href("/clinic/appointments")}
            variant="link"
            className="mt-3 h-auto p-0 text-xs"
          >
            Clinic schedule
          </ButtonLink>
        </section>
      )}
    </aside>
  );
}
