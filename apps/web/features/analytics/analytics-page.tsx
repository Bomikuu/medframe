"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClinicInsightsDocument } from "@/lib/graphql/generated";
import { errorMessage } from "@/lib/auth/client";
import { FinancialOverviewPanel } from "@/features/billing/analytics/financial-overview";
import { downloadFile } from "@/features/consultations/export/client";
import { FormSelect } from "@/features/patients/form-controls";
import { PageHeading, LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { insightsSchema } from "./schema";
import { MetricComparison } from "./metric-comparison";
import { ReportRangeControls, type ReportRange } from "./report-range-controls";
import { ReportPeriodContext } from "./report-period-context";
import { ReportTable } from "./report-table";

export function AnalyticsPage() {
  const { organizationId, workspace, can } = useWorkspace();
  const [branch, setBranch] = useState(workspace.branches[0]?.id ?? "");
  const [range, setRange] = useState<ReportRange>({ days: 30 });
  const [pendingRange, setPendingRange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = can("operations.read") || can("patients.clinical.read") || can("billing.read");
  const remote = useRemote(
    ClinicInsightsDocument,
    { organizationId, branchId: branch, ...range },
    { enabled: allowed && !!branch },
  );
  const parsed = insightsSchema.safeParse(remote.data?.clinicInsights);
  const data = parsed.success ? parsed.data : null;
  const sections = [
    can("operations.read") && "operations",
    can("patients.clinical.read") && "clinical",
    can("billing.read") && "finance",
  ].filter(Boolean);
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        title="Clinic analytics"
        description="Understand activity, accessible clinical workload and recorded finances."
      />
      {!allowed ? (
        <p>Reporting access is required.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-5">
            <div className="min-w-48 flex-1">
              <FormSelect
                id="analytics-branch"
                label="Clinic branch"
                value={branch}
                onChange={setBranch}
                options={workspace.branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
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
                    "medframe-analytics.csv",
                  );
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Preparing export…" : "Export report CSV"}
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
              <ReportPeriodContext period={data} />
              {data.operations && (
                <section
                  aria-label="Clinic operations"
                  className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
                >
                  <h2 className="text-lg font-semibold">Clinic operations</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Appointments by scheduled date; consultation tickets by admission date. Statuses
                    reflect their current state. Department visits are separate.
                  </p>
                  <div className="mt-6 grid gap-7 lg:grid-cols-2">
                    <div>
                      <MetricComparison
                        title="Scheduled appointments"
                        value={data.operations.appointments}
                      />
                      <ReportTable title="Appointments" value={data.operations.appointments} />
                    </div>
                    <div>
                      <MetricComparison
                        title="Consultation queue admissions"
                        value={data.operations.queue}
                      />
                      <ReportTable title="Queue admissions" value={data.operations.queue} />
                    </div>
                  </div>
                </section>
              )}
              {data.clinical && (
                <section
                  aria-label="Accessible clinical workload"
                  className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
                >
                  <h2 className="text-lg font-semibold">Patients you can access</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Consultations created during this period, grouped by current status and provider
                    specialty. Your live patient grants limit this view.
                  </p>
                  <div className="mt-6">
                    <MetricComparison
                      title="Consultations created"
                      value={data.clinical.encounters}
                    />
                  </div>
                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                    {data.clinical.specialties.map((s) => (
                      <div key={s.label}>
                        <dt className="text-muted-foreground capitalize">
                          {s.label.replaceAll("_", " ")}
                        </dt>
                        <dd className="mt-1 font-semibold tabular-nums">{s.count}</dd>
                      </div>
                    ))}
                  </dl>
                  <ReportTable title="Consultations" value={data.clinical.encounters} />
                </section>
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
