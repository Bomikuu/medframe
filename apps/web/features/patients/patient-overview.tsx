"use client";

import { ButtonLink } from "@/components/ui/button-link";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PencilSimpleIcon, ClockCounterClockwiseIcon } from "@/components/icons";
import { PatientRecordDocument } from "@/lib/graphql/generated";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "./use-remote";
import { PageHeading, LoadState, RemoteNotice, dateLabel } from "./feedback";
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
    <div className="grid gap-8">
      <RemoteNotice error={error} retry={reload} />
      <div>
        <Link
          className="mb-5 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          href={href("/clinic/patients")}
        >
          <ArrowLeftIcon />
          All patients
        </Link>
        <PageHeading
          title={patient.fullName}
          description={`${patient.reference} · ${dateLabel(patient.dateOfBirth)}`}
        >
          <div className="flex flex-wrap gap-3">
            {can("patients.demographics.write") && (
              <ButtonLink variant="outline" href={href(`/clinic/patients/${patientId}/edit`)}>
                <PencilSimpleIcon />
                Edit details
              </ButtonLink>
            )}
            <ButtonLink variant="outline" href={href(`/clinic/patients/${patientId}/history`)}>
              <ClockCounterClockwiseIcon />
              History
            </ButtonLink>
          </div>
        </PageHeading>
        {params.get("saved") === "details" && (
          <p role="status" className="text-sm text-primary">
            Patient details saved.
          </p>
        )}
      </div>
      <section aria-labelledby="patientDetailsHeading">
        <h2 id="patientDetailsHeading" className="text-xl font-semibold">
          Patient details
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {[...identity, ...contact].map(([label, value]) => (
            <div key={label} className={label === "Address" ? "sm:col-span-2" : undefined}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-sm leading-6 wrap-anywhere whitespace-pre-wrap">
                {value || "Not recorded"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {can("patients.clinical.read") && <ClinicalHistorySection patientId={patientId} />}
      {can("patients.clinical.read") && (
        <>
          <ConsultationList patientId={patientId} />
          <ChartComparison patientId={patientId} />
          <TreatmentPlans patientId={patientId} />
          <StaffReleases patientId={patientId} />
          <ReportReview patientId={patientId} />
          <DocumentPanel patientId={patientId} />
        </>
      )}
      {can("portal.manage") && <PatientPortalAccess patientId={patientId} />}
      {can("patients.access.manage") && <PatientAccess patientId={patientId} />}
    </div>
  );
}
