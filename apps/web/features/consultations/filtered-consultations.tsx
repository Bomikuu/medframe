"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { StatusBadge } from "@/components/application/status-badge";
import Link from "next/link";
import { useRecordAuthors } from "@/features/records/use-record-authors";
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
            <p className="p-5 text-sm text-muted-foreground">
              No consultations match these filters.
            </p>
          )}
          <ul className="grid gap-3">
            {parsed.data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={href(`/clinic/consultations/${item.id}`)}
                  className="flex flex-wrap justify-between gap-3 rounded-xl border border-border bg-card p-5 hover:bg-surface-hover"
                >
                  <div>
                    <p className="font-medium">{item.patient_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <div className="text-sm">
                    <StatusBadge value={item.status} />
                    <p className="mt-1 text-muted-foreground">{timeLabel(item.updated_at)}</p>
                  </div>
                </Link>
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
