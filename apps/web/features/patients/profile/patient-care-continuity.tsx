"use client";

import { ClipboardList, ArrowUpRight } from "lucide-react";
import { PersonIdentity } from "@/components/application/person-identity";
import { StatusBadge } from "@/components/application/status-badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { ProfileSummary } from "./summary";

/** Recent saved facts only; a draft is not evidence that a patient is currently being treated. */
export function PatientCareContinuity({
  summary,
  onNotes,
}: {
  summary: ProfileSummary | null;
  onNotes: () => void;
}) {
  const { href } = useWorkspace();
  const timeLabel = useClinicTime();
  if (!summary?.clinical) return null;
  const recent = summary.clinical.recent;
  const active = recent.find((row) => ["draft", "in_progress"].includes(row.status));
  const primary = active ?? recent[0];
  const other = recent.filter((row) => row.id !== primary?.id).slice(0, 2);
  return (
    <section aria-label="Recent care" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="size-5 text-info" aria-hidden />
          Recent care
        </h2>
        <Button variant="ghost" className="min-h-11" onClick={onNotes}>
          All notes & diagnoses
        </Button>
      </div>
      {!primary ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          No consultations recorded yet. Open Patient actions to start the first consultation.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 rounded-lg bg-secondary/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{primary.reason}</h3>
                <StatusBadge value={primary.status} />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                <PersonIdentity kind="provider" name={primary.provider_name} />
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Updated {timeLabel(primary.updated_at)}
              </p>
            </div>
            <ButtonLink variant="outline" href={href(`/clinic/consultations/${primary.id}`)}>
              {active ? "Resume saved draft" : "Review consultation"}{" "}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          </div>
          {active && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              A saved draft is available. Resume it to check editing access and continue
              documentation; a draft alone does not mean the patient is currently being treated.
            </p>
          )}
          {!!other.length && (
            <ul className="mt-4 divide-y divide-border">
              {other.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <ButtonLink
                      variant="link"
                      className="h-auto p-0 text-left whitespace-normal"
                      href={href(`/clinic/consultations/${row.id}`)}
                    >
                      {row.reason}
                    </ButtonLink>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      <PersonIdentity kind="provider" name={row.provider_name} />
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {timeLabel(row.created_at)}
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
