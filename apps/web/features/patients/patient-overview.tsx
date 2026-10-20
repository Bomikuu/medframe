"use client";

import { PatientServices } from "@/features/services/patient-services";
import { PatientBilling } from "@/features/billing/patient-billing";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PatientProfileHeader } from "./profile/patient-profile-header";
import { PatientProfileMetrics } from "./profile/patient-profile-metrics";
import { PatientProfileNotes } from "./profile/patient-profile-notes";
import { PatientProfileSidebar } from "./profile/patient-profile-sidebar";
import { profileSummarySchema } from "./profile/summary";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSafety } from "@/features/workspace/safety-provider";
import { PatientAnatomy } from "@/features/anatomy/patient-anatomy";
import { PatientDentalChart } from "@/features/dental/patient-dental-chart";
import { PatientRecordDocument, PatientProfileSummaryDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "./use-remote";
import { LoadState, RemoteNotice, dateLabel } from "./feedback";
import { PatientForm } from "./patient-form";
import { ClinicalHistorySection } from "./clinical-history-form";
import { PatientAccess } from "./patient-access";
import { TreatmentPlans } from "@/features/treatments/treatment-plans";
import { ChartComparison } from "@/features/dental/chart-comparison";
import { PatientPortalAccess } from "@/features/portal/access/patient-portal-access";
import { DiagnosticList } from "@/features/diagnostics/request-list";
import { StaffReleases } from "@/features/portal/staff-releases";
import { ReportReview } from "@/features/portal/report-review";
import { DocumentPanel } from "@/features/documents/document-panel";

export function PatientOverview({
  patientId,
  edit = false,
}: {
  patientId: string;
  edit?: boolean;
}) {
  const { organizationId, href, can, workspace } = useWorkspace();
  const params = useSearchParams();
  const { guard } = useSafety();
  const clinical = can("patients.clinical.read");
  const sections = [
    ["overview", "Overview", true],
    ["medical", "Medical history", clinical],
    ["consultations", "Notes & diagnoses", clinical],
    ["anatomy", "Anatomy", clinical],
    ["dental", "Dental chart", clinical],
    ["treatments", "Treatment plan", clinical],
    ["diagnostics", "Diagnostics", clinical && can("diagnostics.read")],
    ["documents", "Documents", clinical],
    ["services", "Services", can("services.read")],
    ["billing", "Billing", can("billing.read")],
    ["shared", "Shared records", clinical],
    ["access", "Access", can("portal.manage") || can("patients.access.manage")],
  ].filter(([, , visible]) => visible);
  const requested = params.get("tab") ?? (clinical ? "consultations" : "overview");
  const active = sections.some(([id]) => id === requested) ? requested : "overview";
  function changeTab(value: string) {
    void guard(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", value);
      window.history.replaceState(null, "", url.pathname + url.search);
    });
  }
  const { data, error, reload } = useRemote(PatientRecordDocument, { organizationId, patientId });
  const summaryRemote = useRemote(
    PatientProfileSummaryDocument,
    { organizationId, patientId },
    { enabled: !edit },
  );
  const parsedSummary = profileSummarySchema.safeParse(summaryRemote.data?.patientProfileSummary);
  const summary = parsedSummary.success ? parsedSummary.data : null;
  if (!data) return <LoadState error={error} retry={reload} />;
  const patient = data.patientDemographics;
  if (edit)
    return (
      <>
        <RemoteNotice error={error} retry={reload} />
        <PatientForm patient={patient} />
      </>
    );
  const identity = [
    ["Patient reference", patient.reference],
    ["Date of birth", dateLabel(patient.dateOfBirth)],
    ["Sex recorded for care", patient.sex === "not_recorded" ? "Not recorded" : patient.sex],
    [
      "Registration branch",
      workspace.branches.find((branch) => branch.id === patient.branchId)?.name ??
        "Authorized branch",
    ],
  ];
  const contact = [
    ["Email address", patient.email],
    ["Phone number", patient.phone],
    ["Address", patient.address],
    [
      "Emergency contact",
      [
        patient.emergencyContactName,
        patient.emergencyContactRelationship,
        patient.emergencyContactPhone,
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Guardian contact",
      [patient.guardianName, patient.guardianRelationship, patient.guardianPhone]
        .filter(Boolean)
        .join(" · "),
    ],
  ];
  return (
    <div className="grid min-w-0 gap-6 wrap-anywhere">
      <RemoteNotice error={error} retry={reload} />
      <div>
        <Link
          className="mb-5 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          href={href("/clinic/patients")}
        >
          <ArrowLeftIcon />
          All patients
        </Link>
        <PatientProfileHeader
          patient={patient}
          portraitId={summary?.clinical?.portrait_id}
          timezone={summary?.timezone ?? workspace.organization.timezone}
        />
        {params.get("saved") === "details" && (
          <p role="status" className="text-sm text-primary">
            Patient details saved.
          </p>
        )}
      </div>
      <PatientProfileMetrics summary={summary} loading={summaryRemote.loading} onTab={changeTab} />
      {summaryRemote.error !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm"
        >
          <p>Some patient summaries could not be loaded.</p>
          <Button type="button" variant="outline" size="sm" onClick={summaryRemote.reload}>
            Retry summaries
          </Button>
        </div>
      )}
      <Tabs value={String(active)} onValueChange={changeTab} className="min-w-0 gap-6">
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-1">
          <TabsList variant="line" className="h-auto min-w-max justify-start gap-1">
            {sections.map(([id, label]) => (
              <TabsTrigger key={String(id)} value={String(id)}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="services">
          {active === "services" && can("services.read") && (
            <PatientServices patientId={patientId} branchId={patient.branchId} />
          )}
        </TabsContent>
        <TabsContent value="billing">
          {active === "billing" && can("billing.read") && (
            <PatientBilling patientId={patientId} branchId={patient.branchId} />
          )}
        </TabsContent>
        <TabsContent value="overview">
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid min-w-0 gap-5">
              {[
                ["Identity", identity],
                ["Contact & support", contact],
              ].map(([heading, rows]) => (
                <Card
                  key={String(heading)}
                  data-panel
                  className="rounded-xl border border-border py-0 ring-0"
                >
                  <CardHeader className="border-b border-border p-5">
                    <CardTitle>
                      <h2>{String(heading)}</h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <dl className="grid gap-5 sm:grid-cols-2">
                      {(rows as string[][]).map(([label, value]) => (
                        <div
                          key={label}
                          className={label === "Address" ? "sm:col-span-2" : undefined}
                        >
                          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                          <dd className="mt-1 text-sm leading-6 wrap-anywhere whitespace-pre-wrap">
                            {value || "Not recorded"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PatientProfileSidebar patientId={patientId} summary={summary} onTab={changeTab} />
          </div>
        </TabsContent>
        {clinical && (
          <>
            <TabsContent value="medical">
              <ClinicalHistorySection patientId={patientId} />
            </TabsContent>
            <TabsContent value="consultations">
              {!summaryRemote.data ? (
                <LoadState error={summaryRemote.error} retry={summaryRemote.reload} />
              ) : !summary?.clinical ? (
                <p className="rounded-xl border border-border bg-card p-5 text-sm">
                  Clinical summaries are unavailable for this account. Your clinic administrator can
                  review patient access.
                </p>
              ) : (
                <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <PatientProfileNotes
                    patientId={patientId}
                    consultations={summary.clinical.recent}
                  />
                  <PatientProfileSidebar
                    patientId={patientId}
                    summary={summary}
                    onTab={changeTab}
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="anatomy">
              {active === "anatomy" && clinical && <PatientAnatomy patientId={patientId} />}
            </TabsContent>
            <TabsContent value="dental">
              <div className="grid gap-6">
                <PatientDentalChart patientId={patientId} />
                <ChartComparison patientId={patientId} />
              </div>
            </TabsContent>
            <TabsContent value="treatments">
              <TreatmentPlans patientId={patientId} />
            </TabsContent>
            <TabsContent value="diagnostics">
              <DiagnosticList patientId={patientId} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentPanel patientId={patientId} />
            </TabsContent>
            <TabsContent value="shared">
              <div className="grid gap-6">
                <StaffReleases patientId={patientId} />
                <ReportReview patientId={patientId} />
              </div>
            </TabsContent>
          </>
        )}
        <TabsContent value="access">
          <div className="grid gap-6">
            {can("portal.manage") && <PatientPortalAccess patientId={patientId} />}
            {can("patients.access.manage") && <PatientAccess patientId={patientId} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
