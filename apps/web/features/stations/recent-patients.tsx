"use client";

import { parse } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import type { PatientRowFragment } from "@/lib/graphql/generated";

const RecentPatientsDocument = parse(`query StationRecentPatients($organizationId: UUID!) {
  recentPatients(organizationId: $organizationId) { id fullName reference dateOfBirth }
}`) as TypedDocumentNode<{ recentPatients: PatientRowFragment[] }, { organizationId: string }>;

export function RecentPatients({ choose }: { choose: (patient: PatientRowFragment) => void }) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(RecentPatientsDocument, { organizationId });
  if (!remote.data?.recentPatients.length) return null;
  return (
    <section aria-label="Recently opened patients" className="grid gap-3">
      <h3 className="text-sm font-semibold">Recently opened</h3>
      <ul className="flex flex-wrap gap-2">
        {remote.data.recentPatients.map((patient) => (
          <li key={patient.id}>
            <button
              type="button"
              onClick={() => choose(patient)}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left outline-offset-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <PatientAvatar name={patient.fullName} className="size-9 text-xs" />
              <span>
                <span className="block text-sm font-medium">{patient.fullName}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {patient.reference}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
