"use client";

import { useState } from "react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { PatientRecordDocument, ConsultationsDocument } from "@/lib/graphql/generated";
import { LoadState } from "@/features/patients/feedback";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/application/status-badge";
import { PatientContext } from "@/features/consultations/patient-context";

export function StationPatient({ patientId }: { patientId: string }) {
  const { organizationId, href, can } = useWorkspace();
  const [before, setBefore] = useState<string | null>(null);
  const patient = useRemote(PatientRecordDocument, { organizationId, patientId });
  const visits = useRemote(ConsultationsDocument, { organizationId, patientId, before });
  if (!patient.data) return <LoadState error={patient.error} retry={patient.reload} />;
  const details = patient.data.patientDemographics;
  return (
    <div className="grid gap-7">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold">{details.fullName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {details.reference} · {details.dateOfBirth || "Birth date not recorded"} ·{" "}
            {details.phone || "Phone not recorded"}
          </p>
        </div>
        {can("encounters.write") && (
          <ButtonLink href={`${href("/station/clinician/walk-in")}&patient=${patientId}`}>
            Start consultation
          </ButtonLink>
        )}
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Patient consultations</h2>
          {!visits.data ? (
            <LoadState error={visits.error} retry={visits.reload} />
          ) : (
            <>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {visits.data.encounters.map((visit) => (
                  <li
                    key={visit.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div>
                      <h3 className="font-semibold">{visit.reason}</h3>
                      <p className="my-2 text-xs text-muted-foreground">
                        {new Date(visit.createdAt).toLocaleDateString()}
                      </p>
                      <StatusBadge value={visit.status} />
                    </div>
                    <ButtonLink href={href(`/station/clinician/consultations/${visit.id}`)}>
                      Open consultation
                    </ButtonLink>
                  </li>
                ))}
                {!visits.data.encounters.length && (
                  <li className="p-5 text-sm text-muted-foreground">
                    No consultations on this page.
                  </li>
                )}
              </ul>
              <Button
                variant="outline"
                className="justify-self-start"
                disabled={visits.data.encounters.length < 20}
                onClick={() => setBefore(visits.data!.encounters.at(-1)!.id)}
              >
                Older consultations
              </Button>
            </>
          )}
        </section>
        <PatientContext patientId={patientId} />
      </div>
    </div>
  );
}
