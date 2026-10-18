"use client";

import { ClinicalContextDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { ClinicalSummary } from "@/features/patients/clinical-summary";
import { LoadState } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";

export function PatientContext({
  patientId,
  revisionId,
}: {
  patientId: string;
  revisionId?: string | null;
}) {
  const { organizationId } = useWorkspace();
  const remote = useRemote(ClinicalContextDocument, { organizationId, patientId, revisionId });
  return (
    <details open className="rounded-lg border border-border bg-muted p-5">
      <summary className="min-h-11 font-medium">
        <h2 className="inline text-base font-medium">
          {revisionId
            ? "Patient history preserved at finalization"
            : "Current patient history, allergies, and medications"}
        </h2>
      </summary>
      <div className="mt-4">
        {remote.data ? (
          <ClinicalSummary revision={remote.data.patientClinicalContext ?? null} />
        ) : (
          <LoadState error={remote.error} retry={remote.reload} />
        )}
      </div>
    </details>
  );
}
