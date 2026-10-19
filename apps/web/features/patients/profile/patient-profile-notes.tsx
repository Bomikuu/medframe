"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { StatusBadge } from "@/components/application/status-badge";
import { useClinicTime } from "@/components/application/clinical-locale";
import { ConsultationDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { ConsultationList } from "@/features/consultations/consultation-pages";
import { draftSchema } from "@/features/consultations/schema";
import { FormSelect } from "../form-controls";
import { LoadState, RemoteNotice } from "../feedback";
import { useRemote } from "../use-remote";
import type { ProfileConsultation } from "./summary";

export function PatientProfileNotes({
  patientId,
  consultations,
}: {
  patientId: string;
  consultations: ProfileConsultation[];
}) {
  const [selected, setSelected] = useState(consultations[0]?.id ?? "");
  const timeLabel = useClinicTime();
  const selectedId = consultations.some((row) => row.id === selected)
    ? selected
    : (consultations[0]?.id ?? "");
  return (
    <div className="grid min-w-0 gap-4">
      {consultations.length ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1 basis-56">
              <FormSelect
                id="profile-consultation"
                label="Saved consultation"
                value={selectedId}
                onChange={setSelected}
                options={consultations.map((row) => ({
                  value: row.id,
                  label: `${row.reason} · ${timeLabel(row.created_at)}`,
                }))}
              />
            </div>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">
              Read saved notes below. Open the consultation to continue documenting care.
            </p>
          </div>
          <SavedConsultation key={selectedId} encounterId={selectedId} patientId={patientId} />
        </>
      ) : (
        <section className="rounded-xl border border-border bg-card p-8">
          <h2 className="text-base font-semibold">No consultation notes yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start a consultation to record notes, diagnoses and observations for this patient.
          </p>
        </section>
      )}
      <details id="consultation-history" className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer py-1 text-sm font-semibold">
          All consultations and filters
        </summary>
        <div className="mt-5">
          <ConsultationList patientId={patientId} />
        </div>
      </details>
    </div>
  );
}

function SavedConsultation({ encounterId, patientId }: { encounterId: string; patientId: string }) {
  const { organizationId, href } = useWorkspace();
  const timeLabel = useClinicTime();
  const remote = useRemote(ConsultationDocument, { organizationId, encounterId, revisionId: null });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const encounter = remote.data.encounter;
  if (encounter.patientId !== patientId)
    return <p role="alert">This consultation belongs to another patient.</p>;
  const parsed = draftSchema.safeParse(encounter.content);
  if (!parsed.success)
    return (
      <p role="alert">
        These saved notes could not be read. Open the consultation to review the record.
      </p>
    );
  const content = parsed.data;
  const open = href(`/clinic/consultations/${encounterId}`);
  return (
    <>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <section
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
        aria-label="Saved consultation notes"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Consultation notes</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Saved {timeLabel(encounter.updatedAt)} · <StatusBadge value={encounter.status} />
            </p>
          </div>
          <ButtonLink href={open} variant="outline">
            Open consultation
          </ButtonLink>
        </div>
        <dl className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["subjective", "Subjective (S)"],
              ["objective", "Objective (O)"],
              ["assessment", "Assessment (A)"],
              ["plan", "Plan (P)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <dt className="mb-2 text-sm font-medium">{label}</dt>
              <dd className="min-h-28 rounded-lg border border-border bg-background/50 p-3 text-sm leading-6 whitespace-pre-wrap">
                {content.soap[key] || (
                  <span className="text-muted-foreground">Not recorded in this consultation.</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Diagnoses</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Recorded diagnoses retain their clinical certainty.
        </p>
        {content.diagnoses.length ? (
          <ul className="mt-4 divide-y divide-border">
            {content.diagnoses.map((row, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span>
                  {row.description}
                  {row.code ? ` · ${row.code}` : ""}
                </span>
                <StatusBadge value={row.certainty} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRecord
            title="No diagnoses recorded"
            description="Symptoms do not automatically become diagnoses."
          />
        )}
      </section>
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Structured observations</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Reported and observed findings remain distinct.
        </p>
        {content.observations.length ? (
          <dl className="mt-4 divide-y divide-border">
            {content.observations.map((row, i) => (
              <div
                key={i}
                className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm"
              >
                <dt className="font-medium">{row.label}</dt>
                <dd>
                  {row.value}{" "}
                  <span className="ml-2 text-xs text-muted-foreground">{row.source}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <EmptyRecord
            title="No structured observations recorded"
            description="Vitals and exam findings appear here after they are saved."
          />
        )}
      </section>
    </>
  );
}

function EmptyRecord({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
