"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EncounterEditor } from "@/features/consultations/encounter-editor";
import { PatientActionsDialog } from "@/features/patients/profile/patient-actions-dialog";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { SafetyProvider, useSafety } from "@/features/workspace/safety-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { ConsultationDocument, PatientRecordDocument } from "@/lib/graphql/generated";
import { useStationAccess } from "./access-session";

export function StationEncounter({ encounterId }: { encounterId: string }) {
  const { organizationId, href } = useWorkspace();
  const { guard } = useSafety();
  const access = useStationAccess();
  const router = useRouter();
  const params = useSearchParams();
  const revisionId = params.get("revision");
  const remote = useRemote(ConsultationDocument, { organizationId, encounterId, revisionId });
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const patientId = remote.data?.encounter.patientId ?? "";
  const patient = useRemote(
    PatientRecordDocument,
    { organizationId, patientId },
    { enabled: open && !!patientId },
  );
  if (!remote.data) return <LoadState error={remote.error} retry={remote.reload} />;
  return (
    <div className="grid min-w-0 gap-4">
      {(!access || access.kind === "doctor") && (
        <div className="sticky top-[var(--station-session-offset,0px)] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <UserRound aria-hidden className="size-4 text-teal-ink" />
            {remote.data.encounter.patientName}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void guard(() => router.push(href(`/station/clinician/patients/${patientId}`)))
              }
            >
              Patient overview
            </Button>
            <Button ref={trigger} onClick={() => setOpen(true)}>
              <LayoutGrid aria-hidden className="size-4" />
              Patient actions
            </Button>
          </div>
        </div>
      )}
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <EncounterEditor
        key={`${organizationId}:${encounterId}:${revisionId ?? "current"}`}
        initial={remote.data.encounter}
        exactRevision={!!revisionId}
        reload={remote.reload}
        focused
      />
      {patient.data ? (
        <SafetyProvider>
          <PatientActionsDialog
            patient={patient.data.patientDemographics}
            open={open}
            onOpenChange={setOpen}
            returnFocus={trigger}
            updated={() => {
              patient.reload();
              remote.reload();
            }}
            station
            navigate={(target, close) =>
              void guard(() => {
                close();
                router.push(target);
              })
            }
          />
        </SafetyProvider>
      ) : open ? (
        <div role="status" className="rounded-xl border border-border bg-card p-4">
          <LoadState error={patient.error} retry={patient.reload} />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel opening patient actions
          </Button>
        </div>
      ) : null}
    </div>
  );
}
