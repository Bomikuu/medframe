"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ClinicInsightsDocument } from "@/lib/graphql/generated";
import { errorMessage } from "@/lib/auth/client";
import { FinancialOverviewPanel } from "@/features/billing/analytics/financial-overview";
import { downloadFile } from "@/features/consultations/export/client";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { insightsSchema } from "./schema";
import { ActivityOverview } from "./activity-overview";
import { ReportRangeControls, type ReportRange } from "./report-range-controls";
import { dateLabel } from "@/features/patients/calendar-date";
import { Download } from "lucide-react";

export function AnalyticsPage({ clinicalDetails }: { clinicalDetails?: ReactNode }) {
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const { organizationId, workspace, can, branchId: branch } = useWorkspace();
  const [range, setRange] = useState<ReportRange>({ days: 30 });
  const [pendingRange, setPendingRange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed =
    can("operations.read") ||
    can("patients.demographics.read") ||
    can("patients.clinical.read") ||
    can("billing.read");
  const remote = useRemote(
    ClinicInsightsDocument,
    { organizationId, branchId: branch, ...range },
    { enabled: allowed && !!branch },
  );
  const parsed = insightsSchema.safeParse(remote.data?.clinicInsights);
  const data = parsed.success ? parsed.data : null;
  const sections = [
    can("operations.read") && "operations",
    (can("patients.demographics.read") || can("patients.clinical.read")) && "patients",
    can("patients.clinical.read") && "clinical",
    can("billing.read") && "finance",
  ].filter(Boolean);
  return (
    <div className="grid min-w-0 gap-6">
      {!allowed ? (
        <p className="text-sm text-muted-foreground">
          Reporting access is required. Your other clinic tools remain available in the navigation.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1 basis-80">
              <ReportRangeControls
                id="analytics"
                range={range}
                timezone={data?.timezone ?? workspace.organization.timezone}
                currentFrom={data?.current_from}
                currentTo={data?.current_to}
                onApply={setRange}
                onPendingChange={setPendingRange}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || !data || pendingRange}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await downloadFile(
                    "analytics/export",
                    {
                      organization_id: organizationId,
                      branch_id: branch,
                      days: range.days,
                      start_date: range.startDate,
                      end_date: range.endDate,
                      sections,
                    },
                    "medframe-dashboard.csv",
                  );
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download className="size-4" aria-hidden />
              {busy ? "Preparing export…" : "Export dashboard CSV"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {!data ? (
            <LoadState
              error={remote.error ?? (remote.data ? new Error("Report could not be read.") : null)}
              retry={remote.reload}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 text-xs leading-6 text-muted-foreground">
                <p>
                  Selected{" "}
                  <strong className="font-medium text-foreground">
                    {dateLabel(data.current_from)} – {dateLabel(data.current_to)}
                  </strong>
                  <br />
                  Compared with {dateLabel(data.previous_from)} – {dateLabel(data.previous_to)}
                </p>
                <p>
                  Completed clinic days · {data.timezone}
                  <br />
                  Today is excluded from date comparisons.
                </p>
              </div>
              {(data.operations || data.patients || data.clinical) && (
                <ActivityOverview data={data} />
              )}
              {clinicalDetails && (
                <details
                  className="rounded-xl border border-border bg-card px-5 py-1 sm:px-6"
                  onToggle={(event) => setClinicalOpen(event.currentTarget.open)}
                >
                  <summary className="cursor-pointer py-4 text-sm font-semibold">
                    Clinical workspace · recent records, drafts & follow-ups
                  </summary>
                  {clinicalOpen && <div className="pb-5">{clinicalDetails}</div>}
                </details>
              )}
              {can("billing.read") && (
                <FinancialOverviewPanel
                  branchId={branch}
                  periodDays={data.days}
                  periodRange={{ startDate: data.current_from, endDate: data.current_to }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
