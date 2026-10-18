"use client";
import { useState } from "react";
import { PatientReportsDocument, ReviewPatientReportDocument } from "@/lib/graphql/generated";
import { getGraphqlClient } from "@/lib/graphql/client";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadState, failureText, timeLabel } from "@/features/patients/feedback";
import { recordPage } from "@/features/records/schema";
import { PageControls } from "@/features/records/record-filters";
import { reportSchema } from "./schema";
export function ReportReview({ patientId }: { patientId: string }) {
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
        <FormField
          id="reconciled-history"
          label="Reconciled history revision ID (optional)"
          hint="After reviewing and saving history separately, paste its exact revision ID to attribute reconciliation."
        >
          <Input
            id="reconciled-history"
            value={history}
            maxLength={36}
            onChange={(event) => setHistory(event.target.value)}
          />
        </FormField>
      )}
      {error !== null && <p role="alert">{failureText(error)}</p>}
    </section>
  );
}
