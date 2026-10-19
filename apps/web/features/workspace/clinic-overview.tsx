"use client";

import { ButtonLink } from "@/components/ui/button-link";

import { PatientAvatar } from "@/components/application/patient-avatar";
import { EmptyState } from "@/components/application/empty-state";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon, MagnifyingGlassIcon } from "@/components/icons";
import { PatientDashboardDocument, type PatientDashboardQuery } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { PageHeading, LoadState, dateLabel } from "@/features/patients/feedback";
import { useWorkspace } from "./workspace-provider";
import { ClinicalWidgets } from "./clinical-widgets";

import { SetupChecklist } from "./setup-checklist";
import { PlatformLink } from "@/features/platform/clinic-invitations";

export function ClinicOverview() {
  const { workspace, can, href } = useWorkspace();
  return (
    <>
      <PageHeading
        title="Dashboard"
        description={`${workspace.organization.name} · ${workspace.branches.map((branch) => branch.name).join(", ")}`}
      >
        {can("patients.demographics.read") && (
          <ButtonLink variant="outline" href={href("/clinic/patients")}>
            <MagnifyingGlassIcon />
            Find patient
          </ButtonLink>
        )}
        {can("patients.register") && (
          <ButtonLink href={href("/clinic/patients/new")}>
            <PlusIcon />
            Register patient
          </ButtonLink>
        )}
      </PageHeading>
      <div className="mb-4">
        <PlatformLink />
      </div>
      <SetupChecklist />
      {can("patients.demographics.read") ? (
        <PatientOverview />
      ) : (
        <p className="max-w-prose text-sm leading-7 text-muted-foreground">
          Your organization is connected. Contact your clinic administrator if you need
          patient-management permissions.
        </p>
      )}
    </>
  );
}

function PatientOverview() {
  const { organizationId } = useWorkspace();
  const { data, error, reload } = useRemote(PatientDashboardDocument, { organizationId });
  if (!data) return <LoadState error={error} retry={reload} />;
  return (
    <div className="grid gap-6">
      <ClinicalWidgets recentPatients={<RecentPatients patients={data.recentPatients} />} />
    </div>
  );
}

function RecentPatients({ patients }: { patients: PatientDashboardQuery["recentPatients"] }) {
  const { href } = useWorkspace();
  return (
    <section>
      <h2 className="text-xl font-semibold">Recently opened patients</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Patient records you have opened and can still access.
      </p>
      {patients.length ? (
        <ul className="mt-5 divide-y divide-border">
          {patients.map((patient) => (
            <li key={patient.id}>
              <Link
                href={href(`/clinic/patients/${patient.id}`)}
                className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-surface-hover hover:text-primary"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PatientAvatar name={patient.fullName} />
                  <div className="min-w-0">
                    <span className="block font-medium wrap-anywhere">{patient.fullName}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {patient.reference} · {dateLabel(patient.dateOfBirth)}
                    </span>
                  </div>
                </div>
                <ArrowRightIcon className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No recently opened patients"
            description="Find or register a patient to begin."
          />
        </div>
      )}
    </section>
  );
}
