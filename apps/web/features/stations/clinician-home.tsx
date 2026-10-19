"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Stethoscope } from "lucide-react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { ConsultationsDocument } from "@/lib/graphql/generated";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/application/status-badge";
import { LoadState } from "@/features/patients/feedback";
import { ReceiveHandoff } from "./receive-handoff";
import { useStationAccess } from "./access-session";
import { DoctorCodeDialog } from "./doctor-code-dialog";
import { PatientPicker } from "./patient-picker";

export function ClinicianHome() {
  const access = useStationAccess();
  if (access && access.kind !== "doctor")
    return (
      <section className="mx-auto grid max-w-xl gap-5 py-10">
        <h1 className="text-2xl font-semibold">Your assigned consultation</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          This earlier code session is limited to the consultation opened by {access.clinician}. Ask
          for a new doctor workspace code to open other permitted care.
        </p>
        <ButtonLink
          href={`/station/clinician/consultations/${access.encounter_id}?organization=${access.organization_id}`}
        >
          Resume consultation
        </ButtonLink>
      </section>
    );
  return <FullClinicianHome />;
}

function FullClinicianHome() {
  const { organizationId, href, can, overview } = useWorkspace();
  const access = useStationAccess();
  const router = useRouter();
  const [patientOpen, setPatientOpen] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const remote = useRemote(ConsultationsDocument, { organizationId, before });
  if (!can("patients.clinical.read"))
    return (
      <p role="alert">
        A clinical membership and patient access are required. Contact your clinic administrator.
      </p>
    );
  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="mb-2 text-sm font-medium text-teal-ink">Clinical Station</p>
          <h1 className="text-3xl font-semibold">
            {overview.currentUser.displayName || "Your clinical workspace"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            One workspace for your patients, consultations and charts. Choose a patient or start
            with a walk-in and complete their details before saving.
          </p>
        </div>
        {!access && can("encounters.write") && <DoctorCodeDialog />}
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {can("encounters.write") && (
          <ButtonLink
            className="h-auto min-h-24 justify-start gap-4 px-6 py-5"
            href={href("/station/clinician/walk-in")}
          >
            <UserPlus className="size-6" />
            <span className="text-left">
              <span className="block text-base font-semibold">Start walk-in consultation</span>
              <span className="mt-1 block text-xs font-normal opacity-85">
                Notes and charts first · patient details before saving
              </span>
            </span>
          </ButtonLink>
        )}
        <Button
          variant="outline"
          className="h-auto min-h-24 justify-start gap-4 px-6 py-5"
          onClick={() => setPatientOpen(true)}
        >
          <Users className="size-6" />
          <span className="text-left">
            <span className="block text-base font-semibold">Choose patient</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Open permitted patient history and consultations
            </span>
          </span>
        </Button>
      </div>
      <section className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Stethoscope className="size-5" /> Consultations
          </h2>
          <Button
            variant="ghost"
            onClick={() => {
              setBefore(null);
              remote.reload();
            }}
          >
            Refresh latest
          </Button>
        </div>
        {!remote.data ? (
          <LoadState error={remote.error} retry={remote.reload} />
        ) : (
          <>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {remote.data.encounters.map((encounter) => (
                <li
                  key={encounter.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <h3 className="font-semibold">{encounter.patientName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{encounter.reason}</p>
                    <div className="mt-3">
                      <StatusBadge value={encounter.status} />
                    </div>
                  </div>
                  <ButtonLink href={href(`/station/clinician/consultations/${encounter.id}`)}>
                    Open consultation
                  </ButtonLink>
                </li>
              ))}
              {!remote.data.encounters.length && (
                <li className="p-6 text-sm text-muted-foreground">
                  No consultations on this page. Choose a patient or start a walk-in.
                </li>
              )}
            </ul>
            <Button
              variant="outline"
              className="justify-self-start"
              disabled={remote.data.encounters.length < 20}
              onClick={() => setBefore(remote.data!.encounters.at(-1)!.id)}
            >
              Older consultations
            </Button>
          </>
        )}
      </section>
      {!access && (
        <details className="rounded-lg border border-border p-5">
          <summary className="font-medium">
            Receive clinical responsibility from another doctor
          </summary>
          <div className="mt-5">
            <ReceiveHandoff />
          </div>
        </details>
      )}
      <Dialog open={patientOpen} onOpenChange={setPatientOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Choose patient</DialogTitle>
          <DialogDescription>
            Only records permitted to your account and this device’s branch are shown.
          </DialogDescription>
          <PatientPicker
            onSelect={(patient) => router.push(href(`/station/clinician/patients/${patient.id}`))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
