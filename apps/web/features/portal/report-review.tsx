"use client";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useState } from "react";
import {
  PatientReportsDocument,
  ReviewPatientReportDocument,
  ReconciliationHistoryDocument,
} from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { FormSelect } from "@/features/patients/form-controls";
import { Button } from "@/components/ui/button";
import { LoadState, failureText } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { reportSchema } from "./schema";
export function ReportReview({ patientId }: { patientId: string }) {
  const timeLabel = useClinicTime();
  const { organizationId, can } = useWorkspace();
  const [after, setAfter] = useState<string>();
  const [history, setHistory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const capture = useRequestScope();
  const remote = useRemote(PatientReportsDocument, { organizationId, patientId, after });
  const parsed = recordPage(reportSchema).safeParse(remote.data?.patientReports);
  return (
    <section className="grid gap-5 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">Patient-reported information</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        These submissions are unverified reports. Review and reconcile them separately before
        changing confirmed clinical history.
      </p>
      {!remote.data ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : parsed.success ? (
        <>
          {!parsed.data.items.length && (
            <p className="text-sm text-muted-foreground">No patient reports received.</p>
          )}
          {parsed.data.items.map((item) => (
            <article key={item.id} className="grid gap-3 border-b border-border py-4">
              <h3 className="font-medium">
                {item.category} · {item.state}
              </h3>
              <p className="text-xs text-muted-foreground">
                Reported by {item.author} · {timeLabel(item.created_at)}
              </p>
              <p className="max-w-prose leading-7 whitespace-pre-wrap">{item.text}</p>
              {item.history_revision_id && (
                <p className="text-xs text-muted-foreground">
                  Reconciled history revision: {item.history_revision_id}
                </p>
              )}
              {can("patients.clinical.write") && (
                <div className="flex gap-3">
                  {["acknowledged", "reviewed"].map((state) => (
                    <Button
                      key={state}
                      type="button"
                      variant="outline"
                      disabled={busy || item.state === state}
                      onClick={async () => {
                        const current = capture();
                        setBusy(true);
                        setError(null);
                        try {
                          await getGraphqlClient().request(ReviewPatientReportDocument, {
                            organizationId,
                            reportId: item.id,
                            state,
                            expectedVersion: item.version,
                            historyRevisionId: history || null,
                          });
                          if (current()) remote.reload();
                        } catch (failure) {
                          if (current()) setError(failure);
                        } finally {
                          if (current()) setBusy(false);
                        }
                      }}
                    >
                      Mark {state}
                    </Button>
                  ))}
                </div>
              )}
            </article>
          ))}
          <PageControls after={after} next={parsed.data.end_cursor} onChange={setAfter} />
        </>
      ) : (
        <p role="alert">Patient reports could not be read.</p>
      )}
      {can("patients.clinical.write") && (
        <ReconciliationHistory patientId={patientId} value={history} onChange={setHistory} />
      )}
      {error !== null && <p role="alert">{failureText(error)}</p>}
    </section>
  );
}

function ReconciliationHistory({
  patientId,
  value,
  onChange,
}: {
  patientId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const timeLabel = useClinicTime();
  const { organizationId } = useWorkspace();
  const [afterVersion, setAfterVersion] = useState<number>();
  const [selectedLabel, setSelectedLabel] = useState("");
  const remote = useRemote(ReconciliationHistoryDocument, {
    organizationId,
    patientId,
    afterVersion,
  });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  const page = remote.data.patientClinicalRevisions;
  const options = page.items.map((item) => ({
    value: item.id,
    label: `Version ${item.version} · ${item.authorName} · ${timeLabel(item.createdAt)}`,
  }));
  if (value && !options.some((item) => item.value === value))
    options.unshift({ value, label: selectedLabel });
  return (
    <div className="grid max-w-2xl gap-3">
      <FormSelect
        id="reconciled-history"
        label="Reconciled history version (optional)"
        value={value || "none"}
        onChange={(identifier) => {
          setSelectedLabel(options.find((item) => item.value === identifier)?.label ?? "");
          onChange(identifier === "none" ? "" : identifier);
        }}
        options={[{ value: "none", label: "No reconciliation selected" }, ...options]}
      />
      <p className="text-xs leading-6 text-muted-foreground">
        Review and save medical history separately, then select that saved version to attribute
        reconciliation. Reviewing a report does not change clinical history.
      </p>
      <div className="flex gap-3">
        {afterVersion !== undefined && (
          <Button type="button" variant="outline" onClick={() => setAfterVersion(undefined)}>
            Newest history versions
          </Button>
        )}
        {page.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAfterVersion(page.endVersion ?? undefined)}
          >
            Older history versions
          </Button>
        )}
      </div>
    </div>
  );
}
