"use client";

import { usePatientRecordReadOnly } from "@/features/patients/profile/patient-record-browse";
import { FilteredConsultations } from "./filtered-consultations";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { PageHeading, LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { ConsultationDocument } from "@/lib/graphql/generated";
import { EncounterEditor } from "./encounter-editor";
import { ConsultationStartDialog } from "./start-consultation-dialog";

export function ConsultationList({ patientId }: { patientId?: string }) {
  const readOnly = usePatientRecordReadOnly();
  const { href, can } = useWorkspace();
  return (
    <section>
      <PageHeading
        title={patientId ? "Consultation history" : "Consultations"}
        level={patientId ? 2 : 1}
        description="Review ongoing care, saved drafts and completed consultations."
      >
        {!readOnly && can("encounters.write") && (
          <ButtonLink
            href={
              patientId
                ? `${href("/clinic/consultations/new")}&patient=${patientId}`
                : href("/clinic/patients")
            }
          >
            {patientId ? "Start consultation" : "Choose patient to begin"}
          </ButtonLink>
        )}
      </PageHeading>
      <FilteredConsultations patientId={patientId} />
    </section>
  );
}

export function ConsultationPage({
  encounterId,
  focused = false,
  initialSection,
}: {
  encounterId: string;
  focused?: boolean;
  initialSection?: "notes";
}) {
  const { organizationId } = useWorkspace();
  const params = useSearchParams();
  const revisionId = params.get("revision");
  const remote = useRemote(ConsultationDocument, { organizationId, encounterId, revisionId });
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <>
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <EncounterEditor
        key={`${organizationId}:${encounterId}:${revisionId ?? "current"}`}
        initial={remote.data.encounter}
        exactRevision={!!revisionId}
        reload={remote.reload}
        focused={focused}
        initialSection={initialSection}
      />
    </>
  );
}

export function NewConsultation() {
  return <ConsultationStartDialog />;
}
