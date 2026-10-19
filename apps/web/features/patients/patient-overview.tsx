"use client";

import { ButtonLink } from "@/components/ui/button-link";

import Link from "next/link";
import { Stethoscope, MoreHorizontal, CalendarDays, FileText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PencilSimpleIcon, ClockCounterClockwiseIcon } from "@/components/icons";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSafety } from "@/features/workspace/safety-provider";
import { PatientDentalChart } from "@/features/dental/patient-dental-chart";
import { PatientRecordDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "./use-remote";
import { LoadState, RemoteNotice, dateLabel } from "./feedback";
import { PatientForm } from "./patient-form";
import { ClinicalHistorySection } from "./clinical-history-form";
import { PatientAccess } from "./patient-access";
import { ConsultationList } from "@/features/consultations/consultation-pages";
import { TreatmentPlans } from "@/features/treatments/treatment-plans";
import { ChartComparison } from "@/features/dental/chart-comparison";
import { PatientPortalAccess } from "@/features/portal/access/patient-portal-access";
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
    ["consultations", "Consultations", clinical],
    ["dental", "Dental chart", clinical],
    ["treatments", "Treatments", clinical],
    ["documents", "Documents", clinical],
    ["shared", "Shared records", clinical],
    ["access", "Access", can("portal.manage") || can("patients.access.manage")],
  ].filter(([, , visible]) => visible);
  const requested = params.get("tab") ?? "overview";
  const active = sections.some(([id]) => id === requested) ? requested : "overview";
  function changeTab(value: string) {
    void guard(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", value);
      window.history.replaceState(null, "", url.pathname + url.search);
    });
  }
  const { data, error, reload } = useRemote(PatientRecordDocument, { organizationId, patientId });
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
        <section
          aria-label="Patient identity"
          data-panel
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 flex-1 basis-72 items-center gap-4">
              <PatientAvatar
                name={patient.fullName}
                className="size-16 border-0 text-xl sm:size-20"
              />
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-bold wrap-anywhere sm:text-[30px]">
                  {patient.fullName}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{patient.reference}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {can("encounters.write") && (
                <ButtonLink href={`${href("/clinic/consultations/new")}&patient=${patientId}`}>
                  <Stethoscope />
                  Start consultation
                </ButtonLink>
              )}
              {can("patients.demographics.write") && (
                <ButtonLink variant="outline" href={href(`/clinic/patients/${patientId}/edit`)}>
                  <PencilSimpleIcon />
                  Edit details
                </ButtonLink>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="More patient actions"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {clinical && (
                    <DropdownMenuItem asChild>
                      <Link href={`${href(`/clinic/patients/${patientId}`)}&tab=documents`}>
                        <FileText />
                        Documents
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={href(`/clinic/patients/${patientId}/history`)}>
                      <ClockCounterClockwiseIcon />
                      History
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-teal-ink" />
              Born {dateLabel(patient.dateOfBirth)}
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound className="size-4 text-teal-ink" />
              {patient.sex === "not_recorded" ? "Sex not recorded" : patient.sex}
            </span>
            <span>
              {workspace.branches.find((branch) => branch.id === patient.branchId)?.name ??
                "Authorized branch"}
            </span>
          </div>
        </section>
        {params.get("saved") === "details" && (
          <p role="status" className="text-sm text-primary">
            Patient details saved.
          </p>
        )}
      </div>
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
        <TabsContent value="overview">
          <div className="grid items-start gap-6 xl:grid-cols-2">
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
        </TabsContent>
        {clinical && (
          <>
            <TabsContent value="medical">
              <ClinicalHistorySection patientId={patientId} />
            </TabsContent>
            <TabsContent value="consultations">
              <ConsultationList patientId={patientId} />
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
