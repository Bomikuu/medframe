"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, History, Wallet, Users, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { useRemote } from "@/features/patients/use-remote";
import { PatientRecordDocument } from "@/lib/graphql/generated";
import { LoadState, dateLabel } from "@/features/patients/feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Money } from "@/features/billing/controls";
import {
  PatientActionsDialog,
  type ActionId,
} from "@/features/patients/profile/patient-actions-dialog";
import { PatientProfilePhoto } from "@/features/patients/profile/patient-profile-photo";
import { ProfileClinicalContext } from "@/features/patients/profile/patient-clinical-context";
import { StatusBadge } from "@/components/application/status-badge";
import { PatientPicker } from "./patient-picker";
import { StationPatientHeader } from "./station-patient-header";
import { StationConsultations } from "./station-consultations";
import { stationRequest } from "./client";
import { errorMessage } from "@/lib/auth/client";
import { callDate } from "@/features/calls/call-format";

type Overview = {
  portrait_id: string | null;
  consultation_count: number;
  updated_at: string;
  operations_available: boolean;
  upcoming: { id: string; start: string; end: string; reason: string; status: string }[];
  queue: { number: number; status: string; date: string } | null;
  financial: { balances: { currency: string; outstanding: string; unpaid_count: number }[] } | null;
};

export function StationPatient({ patientId }: { patientId: string }) {
  const { organizationId, workspace, href } = useWorkspace();
  const { guard } = useSafety();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<ActionId | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const patient = useRemote(PatientRecordDocument, { organizationId, patientId });
  const reload = useCallback(() => {
    setGeneration((value) => value + 1);
    patient.reload();
  }, [patient.reload]);
  useEffect(() => {
    let active = true;
    setOverview(null);
    setError("");
    void stationRequest<Overview>("patient", {
      organization_id: organizationId,
      patient_id: patientId,
    })
      .then((value) => {
        if (active) setOverview(value);
      })
      .catch((failure) => {
        if (active) setError(errorMessage(failure));
      });
    return () => {
      active = false;
    };
  }, [organizationId, patientId, generation]);
  if (!patient.data) return <LoadState error={patient.error} retry={patient.reload} />;
  const details = patient.data.patientDemographics;
  const openAction = (value: ActionId | null = null) => {
    setAction(value);
    setActionsOpen(true);
  };
  return (
    <div className="grid min-w-0 gap-6">
      <StationPatientHeader
        patient={details}
        portraitId={overview?.portrait_id}
        branch={
          workspace.branches.find((row) => row.id === details.branchId)?.name ?? "Clinic branch"
        }
        timezone={workspace.organization.timezone}
        actions={() => openAction()}
        switchPatient={() => setSwitchOpen(true)}
        trigger={trigger}
        photo={
          <PatientProfilePhoto patient={details} imageId={overview?.portrait_id} onSaved={reload} />
        }
      />
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 p-4 text-sm text-destructive"
        >
          <p>{error} Patient overview could not be refreshed.</p>
          <Button variant="outline" onClick={reload}>
            <RefreshCw aria-hidden className="size-4" />
            Retry overview
          </Button>
        </div>
      )}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <ProfileClinicalContext patientId={patientId} onReview={() => openAction("medical")} />
          <StationConsultations patientId={patientId} />
        </div>
        <aside className="grid min-w-0 gap-4" aria-label="Patient visit context">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <History aria-hidden className="size-4 text-teal-ink" />
              Care activity
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {overview
                ? `${overview.consultation_count.toLocaleString()} saved consultations`
                : error
                  ? "Activity unavailable"
                  : "Loading care activity…"}
            </p>
            {overview?.queue && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium">
                  Queue {String(overview.queue.number).padStart(3, "0")} ·{" "}
                  {dateLabel(overview.queue.date)}
                </p>
                <span className="mt-2 inline-block">
                  <StatusBadge value={overview.queue.status} />
                </span>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays aria-hidden className="size-4 text-info" />
              Upcoming with you
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Up to four booked visits with your provider profile.
            </p>
            {overview?.upcoming.map((row) => (
              <div key={row.id} className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-semibold">
                  {callDate(row.start, workspace.organization.timezone)}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {row.reason || "Reason not recorded"}
                </p>
                <span className="mt-2 inline-block">
                  <StatusBadge value={row.status} />
                </span>
              </div>
            ))}
            {overview && !overview.upcoming.length && (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {overview.operations_available
                  ? "No upcoming booked visits with you."
                  : "Visit information is unavailable for this session."}
              </p>
            )}
          </section>
          {overview?.financial && (
            <section className="rounded-xl border border-warning/20 bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Wallet aria-hidden className="size-4 text-warning" />
                Patient balance
              </h2>
              {overview.financial.balances.map((row) => (
                <div key={row.currency} className="mt-3">
                  <p className="text-xl font-semibold">
                    <Money value={row.outstanding} code={row.currency} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.unpaid_count} issued invoices with a balance
                  </p>
                </div>
              ))}
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Use Patient actions to record money already received, when permitted.
              </p>
            </section>
          )}
        </aside>
      </div>
      {
        <PatientActionsDialog
          key={`${patientId}:${action ?? "all"}`}
          patient={details}
          portraitId={overview?.portrait_id}
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          returnFocus={trigger}
          updated={reload}
          station
          initialAction={action}
        />
      }
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle className="pr-8">
            <Users aria-hidden className="mr-2 inline size-5 text-teal-ink" />
            Switch patient
          </DialogTitle>
          <DialogDescription>
            Choose a permitted patient. Unsaved changes are checked before switching.
          </DialogDescription>
          <PatientPicker
            onSelect={(row) =>
              void guard(() => {
                setSwitchOpen(false);
                router.push(href(`/station/clinician/patients/${row.id}`));
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
