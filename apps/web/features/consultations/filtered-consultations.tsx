"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { useClinicTime } from "@/components/application/clinical-locale";
import { StatusBadge } from "@/components/application/status-badge";
import Link from "next/link";
import { useRecordAuthors } from "@/features/records/use-record-authors";
import { EmptyState } from "@/components/application/empty-state";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useState } from "react";
import { ConsultationRecordsDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState } from "@/features/patients/feedback";
import { consultationRow, recordPage } from "@/features/records/schema";
import {
  RecordFilterForm,
  PageControls,
  type RecordFilters,
} from "@/features/records/record-filters";

export function FilteredConsultations({ patientId }: { patientId?: string }) {
  const timeLabel = useClinicTime();
  const { organizationId, href } = useWorkspace();
  const [filters, setFilters] = useState<RecordFilters>({});
  const [after, setAfter] = useState<string>();
  const remote = useRemote(ConsultationRecordsDocument, {
    organizationId,
    patientId,
    filters,
    after,
  });
  const authors = useRecordAuthors(patientId);
  const parsed = recordPage(consultationRow).safeParse(remote.data?.consultationRecords);
  return (
    <>
      <RecordFilterForm
        tooth
        statuses={["draft", "in_progress", "completed", "finalized", "amendment"]}
        authors={authors}
        onApply={(value) => {
          setFilters(value);
          setAfter(undefined);
        }}
      />
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {!parsed.data.items.length && (
            <EmptyState
              illustration="medical-records"
              title={
                Object.keys(filters).length ? "No matching consultations" : "No consultations yet"
              }
              description={
                Object.keys(filters).length
                  ? "Try another search or clear the filters to see more records."
                  : "Consultations appear here once care has started."
              }
            />
          )}
          <ul className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {parsed.data.items.map((item) => (
              <li key={item.id} className="min-w-0 rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PatientAvatar name={item.patient_name} className="size-14 text-base" />
                    <div className="min-w-0">
                      <Link
                        href={href(`/clinic/consultations/${item.id}`)}
                        className="inline-block rounded py-1 text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {item.patient_name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <PersonIdentity
                          kind="provider"
                          name={item.provider_name ?? "Provider not recorded"}
                        />
                      </p>
                    </div>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <p className="mt-4 text-sm leading-6 font-medium">{item.reason}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="mt-1 leading-5">{timeLabel(item.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last updated</dt>
                    <dd className="mt-1 leading-5">{timeLabel(item.updated_at)}</dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Version {item.version}
                </p>
              </li>
            ))}
          </ul>
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Consultations could not be read. Reload the list.</p>
      )}
    </>
  );
}
