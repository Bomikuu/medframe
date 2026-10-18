"use client";

import { HistoryRecords } from "@/features/records/history-records";
import { ButtonLink } from "@/components/ui/button-link";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClinicalRevisionsDocument, PatientHistoryDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "./use-remote";
import { PageHeading, LoadState, timeLabel } from "./feedback";
import { ClinicalSummary } from "./clinical-summary";

const eventLabels: Record<string, string> = {
  registered: "Patient registered",
  "demographics.updated": "Patient details updated",
  "clinical.updated": "Medical history updated",
  "access.granted": "Clinical access granted",
  "access.revoked": "Clinical access revoked",
  "encounter.created": "Consultation started",
  "encounter.finalized": "Consultation finalized",
  "encounter.amended": "Consultation amended",
};

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { organizationId, can, href } = useWorkspace();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const { data, error, reload, loading } = useRemote(PatientHistoryDocument, {
    organizationId,
    patientId,
    after: cursors[cursors.length - 1],
  });
  return (
    <>
      <PageHeading
        title="Patient history"
        description="A record of saved changes, attributed to the staff member and server time."
      >
        <ButtonLink variant="outline" href={href(`/clinic/patients/${patientId}`)}>
          Back to patient
        </ButtonLink>
      </PageHeading>
      {can("patients.clinical.read") ? (
        <HistoryRecords patientId={patientId} />
      ) : !data ? (
        <LoadState error={error} retry={reload} />
      ) : (
        <section className="mb-10">
          <h2 className="text-xl font-semibold">Timeline</h2>
          <ol className="mt-5 divide-y divide-border border-y border-border">
            {data.patientTimeline.items.map((event) => (
              <li key={event.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="text-sm font-medium">
                    {eventLabels[event.action] ?? "Record updated"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{event.authorName}</p>
                  {event.encounterId && event.encounterRevisionId && (
                    <ButtonLink
                      variant="link"
                      href={`${href(`/clinic/consultations/${event.encounterId}`)}&revision=${event.encounterRevisionId}`}
                    >
                      Open preserved visit revision
                    </ButtonLink>
                  )}
                </div>
                <time
                  dateTime={event.createdAt}
                  className="text-xs leading-6 text-muted-foreground"
                >
                  {timeLabel(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
          {!data.patientTimeline.items.length && (
            <p className="py-6 text-sm text-muted-foreground">No timeline entries available.</p>
          )}
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              disabled={cursors.length === 1 || loading}
              onClick={() => setCursors((values) => values.slice(0, -1))}
            >
              Newer events
            </Button>
            <Button
              variant="outline"
              disabled={!data.patientTimeline.hasNextPage || loading}
              onClick={() =>
                setCursors((values) => [...values, data.patientTimeline.endCursor ?? null])
              }
            >
              Older events
            </Button>
          </div>
        </section>
      )}
      {can("patients.clinical.read") && <ClinicalRevisions patientId={patientId} />}
    </>
  );
}

function ClinicalRevisions({ patientId }: { patientId: string }) {
  const { organizationId } = useWorkspace();
  const [pages, setPages] = useState<(number | null)[]>([null]);
  const { data, error, reload, loading } = useRemote(ClinicalRevisionsDocument, {
    organizationId,
    patientId,
    afterVersion: pages[pages.length - 1],
  });
  if (!data) return <LoadState error={error} retry={reload} />;
  const page = data.patientClinicalRevisions;
  return (
    <section className="grid gap-5 border-t border-border pt-8">
      <div>
        <h2 className="text-xl font-semibold">Medical history revisions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved versions are read-only. Current history is edited from the patient overview.
        </p>
      </div>
      {!page.items.length && (
        <p className="text-sm text-muted-foreground">No medical history has been saved.</p>
      )}
      {page.items.map((revision) => (
        <details key={revision.id} className="rounded-lg border border-border bg-card p-5">
          <summary className="text-sm font-medium text-primary hover:underline">
            Version {revision.version} · {revision.authorName}
          </summary>
          <div className="mt-5">
            <ClinicalSummary revision={revision} />
          </div>
        </details>
      ))}
      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={pages.length === 1 || loading}
          onClick={() => setPages((values) => values.slice(0, -1))}
        >
          Newer versions
        </Button>
        <Button
          variant="outline"
          disabled={!page.hasNextPage || loading}
          onClick={() => setPages((values) => [...values, page.endVersion ?? null])}
        >
          Older versions
        </Button>
      </div>
    </section>
  );
}
