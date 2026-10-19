"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useRecordAuthors } from "./use-record-authors";
import { useState } from "react";
import { z } from "zod";
import { HistoryRecordsDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { LoadState } from "@/features/patients/feedback";
import { ButtonLink } from "@/components/ui/button-link";
import { recordPage } from "./schema";
import { RecordFilterForm, PageControls, type RecordFilters } from "./record-filters";
const eventSchema = z.object({
  id: z.string(),
  action: z.string(),
  created_at: z.string(),
  author_name: z.string(),
  encounter_id: z.string().nullable(),
  encounter_revision_id: z.string().nullable(),
});
export function HistoryRecords({ patientId }: { patientId: string }) {
  const timeLabel = useClinicTime();
  const { organizationId, href } = useWorkspace();
  const authors = useRecordAuthors(patientId);
  const [filters, setFilters] = useState<RecordFilters>({});
  const [after, setAfter] = useState<string>();
  const remote = useRemote(HistoryRecordsDocument, { organizationId, patientId, filters, after });
  const parsed = recordPage(eventSchema).safeParse(remote.data?.historyRecords);
  return (
    <section className="mb-10 grid gap-4">
      <h2 className="text-xl font-semibold">Timeline</h2>
      <RecordFilterForm
        authors={authors}
        types={[
          "registered",
          "demographics.updated",
          "clinical.updated",
          "encounter.created",
          "encounter.finalized",
          "encounter.amended",
          "access.granted",
          "access.revoked",
        ]}
        onApply={(value) => {
          setFilters(value);
          setAfter(undefined);
        }}
      />
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          <ol className="ml-2 border-l-2 border-border pl-5">
            {parsed.data.items.map((item) => (
              <li
                key={item.id}
                className="relative flex flex-wrap justify-between gap-4 border-b border-border py-5 before:absolute before:top-6 before:-left-[27px] before:size-3 before:rounded-full before:border-2 before:border-background before:bg-primary"
              >
                <div>
                  <h3 className="text-sm font-medium">{item.action.replaceAll(".", " ")}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.author_name}</p>
                  {item.encounter_id && item.encounter_revision_id && (
                    <ButtonLink
                      variant="link"
                      href={`${href(`/clinic/consultations/${item.encounter_id}`)}&revision=${item.encounter_revision_id}`}
                    >
                      Open preserved visit revision
                    </ButtonLink>
                  )}
                </div>
                <time dateTime={item.created_at} className="text-xs text-muted-foreground">
                  {timeLabel(item.created_at)}
                </time>
              </li>
            ))}
          </ol>
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">No history matches these filters.</p>
          )}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">History could not be read.</p>
      )}
    </section>
  );
}
