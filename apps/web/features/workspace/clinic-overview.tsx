"use client";

import { ButtonLink } from "@/components/ui/button-link";

import Link from "next/link";
import { ArrowRightIcon, PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { PatientDashboardDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { PageHeading, LoadState, dateLabel } from "@/features/patients/feedback";
import { useWorkspace } from "./workspace-provider";

export function ClinicOverview() {
  const { workspace, can } = useWorkspace();
  return (
    <>
      <PageHeading
        title="Your clinic workspace"
        description={`${workspace.organization.name} · ${workspace.branches.map((branch) => branch.name).join(", ")}`}
      />
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
  const { organizationId, href, can } = useWorkspace();
  const { data, error, reload } = useRemote(PatientDashboardDocument, { organizationId });
  if (!data) return <LoadState error={error} retry={reload} />;
  return (
    <div className="grid gap-10">
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">Patient workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.clinicPatients.totalCount.toLocaleString("en-PH")} patients available to you
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink variant="outline" href={href("/clinic/patients")}>
            <MagnifyingGlassIcon />
            Find patient
          </ButtonLink>
          {can("patients.register") && (
            <ButtonLink href={href("/clinic/patients/new")}>
              <PlusIcon />
              Register patient
            </ButtonLink>
          )}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Recently opened</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Patient records you have opened and can still access.
        </p>
        {data.recentPatients.length ? (
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {data.recentPatients.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={href(`/clinic/patients/${patient.id}`)}
                  className="flex items-center justify-between gap-4 py-5 hover:text-primary"
                >
                  <div className="min-w-0">
                    <span className="block font-medium wrap-anywhere">{patient.fullName}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {patient.reference} · {dateLabel(patient.dateOfBirth)}
                    </span>
                  </div>
                  <ArrowRightIcon className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm leading-6 text-muted-foreground">
            No recently opened patients. Find or register a patient to begin.
          </p>
        )}
      </section>
    </div>
  );
}
