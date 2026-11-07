"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PatientSearchDialog } from "@/features/patients/patient-search-dialog";
import { ArrowLeft, Clock3, Stethoscope, UserRoundSearch } from "lucide-react";
import { PersonIdentity } from "@/components/application/person-identity";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { OperationNotice } from "./controls";
import { QueueRow } from "./queue";
import { OnlineRoomManagement } from "@/features/calls/room-management";
import { clock, type Appointment, type OperationsSetup, type Ticket } from "./schema";
import { timeLabel } from "./calendar-dates";
import { useOperationsAction } from "./use-operations";

export function AppointmentDetails({
  row,
  current,
  setup,
  reload,
  close,
  reschedule,
  stale,
  backLabel,
}: {
  row: Appointment;
  current: Ticket[];
  setup: OperationsSetup;
  reload: () => void;
  close: () => void;
  reschedule: () => void;
  stale: boolean;
  backLabel?: string;
}) {
  const { can, href } = useWorkspace();
  const action = useOperationsAction();
  const router = useRouter();
  const [other, setOther] = useState(false);
  const active = current.filter((ticket) => ticket.provider_id === row.provider_id);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) close();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="pr-8 text-xl">Appointment & current care</DialogTitle>
        <DialogDescription>
          {row.online_timing_mode === "instant"
            ? "Instant consultation"
            : `${clock(row.start, setup.timezone)}–${timeLabel(row.end, setup.timezone)} · ${setup.timezone}`}{" "}
          · <PersonIdentity kind="provider" name={row.provider} imageId={row.provider_photo_id} />
        </DialogDescription>
        {backLabel && (
          <Button type="button" variant="ghost" className="w-fit" onClick={close}>
            <ArrowLeft aria-hidden className="size-4" />
            {backLabel}
          </Button>
        )}
        {stale && (
          <p role="status" className="text-xs text-muted-foreground">
            Updating appointment details… Actions will be available when the latest status arrives.
          </p>
        )}
        <fieldset disabled={stale} className="grid min-w-0 gap-4 border-0 p-0 disabled:opacity-80">
          <div inert={stale} className="grid min-w-0 gap-4">
            <div className="flex items-center gap-4 border-b border-border pb-5">
              <PatientAvatar
                name={row.patient ?? "Patient"}
                imageId={row.patient_portrait_id ?? undefined}
                className="size-14"
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {row.online_timing_mode === "instant"
                    ? "Instant consultation patient"
                    : "Scheduled patient"}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{row.patient}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.reference} · {row.resource ?? "No room reserved"}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge value={row.status} />
              </div>
            </div>
            <div className="grid gap-1 text-sm">
              <h3 className="font-medium">Reason for visit</h3>
              <p className="text-muted-foreground">
                {row.reason?.trim() || "No reason recorded for this booking."}
              </p>
            </div>
            {row.online_timing_mode === "instant" ? (
              <p className="text-xs leading-5 text-muted-foreground">
                This is an instant consultation. Open the call room to admit the patient and end it
                when finished; no scheduled slot is reserved.
              </p>
            ) : row.status !== "booked" ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Only booked appointments can be edited. For checked-in or completed visits, ask
                reception to arrange a new booking.
              </p>
            ) : !can("appointments.manage") ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Your clinic access allows viewing this booking. Ask reception or an appointment
                manager to change its schedule.
              </p>
            ) : null}
            <OperationNotice error={action.error} message={action.message} />
            <OnlineRoomManagement appointment={row} reload={reload} />
            <div className="grid gap-3 rounded-lg bg-teal-50 p-4 text-teal-950">
              <h3 className="flex items-center gap-2 font-semibold">
                <Stethoscope aria-hidden className="size-4" />
                Actually in service
              </h3>
              {active.length ? (
                active.map((ticket) => (
                  <div key={ticket.id} className="text-sm">
                    <p className="font-semibold">
                      <PersonIdentity
                        kind="patient"
                        name={ticket.patient ?? "Patient"}
                        imageId={ticket.patient_portrait_id}
                      />{" "}
                      · Queue #{ticket.number}
                    </p>
                    <p className="mt-1">
                      {ticket.patient_id === row.patient_id
                        ? "The scheduled patient is in service."
                        : "A different patient is in service. This booking stays assigned to its scheduled patient."}
                    </p>
                    {ticket.service_start && (
                      <p className="mt-2 flex items-center gap-2 text-xs">
                        <Clock3 aria-hidden className="size-3.5" />
                        Started {clock(ticket.service_start, setup.timezone)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm">
                  No in-service queue ticket is recorded for this provider in this branch. An open
                  draft alone does not indicate ongoing treatment.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {row.patient_id && can("patients.demographics.read") && (
                <ButtonLink variant="outline" href={href(`/clinic/patients/${row.patient_id}`)}>
                  Patient record
                </ButtonLink>
              )}
              {row.status === "booked" &&
                row.online_timing_mode !== "instant" &&
                can("appointments.manage") && (
                  <>
                    <Button
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          "check_in",
                          { id: row.id, expected_version: row.version },
                          reload,
                        )
                      }
                    >
                      Check in patient
                    </Button>
                    <Button variant="outline" onClick={reschedule}>
                      Edit appointment
                    </Button>
                  </>
                )}
              {can("encounters.write") && (
                <Button variant="outline" onClick={() => setOther(true)}>
                  <UserRoundSearch aria-hidden className="size-4" />
                  Choose another patient
                </Button>
              )}
            </div>
            <PatientSearchDialog
              open={other}
              onOpenChange={setOther}
              branchId={setup.branch_id}
              title="Choose another patient"
              description="Open a new consultation for another patient. This appointment stays unchanged."
              actionLabel="Start consultation"
              select={(patient) =>
                router.push(
                  `${href("/clinic/consultations/new")}&patient=${patient.id}&provider=${row.provider_id}`,
                )
              }
            />
            {row.ticket && (
              <CareTicket
                title="Scheduled patient’s queue & consultation"
                ticket={row.ticket}
                reload={reload}
              />
            )}
            {active
              .filter((ticket) => ticket.id !== row.ticket?.id)
              .map((ticket) => (
                <CareTicket
                  key={ticket.id}
                  title="Current patient’s queue & consultation"
                  ticket={ticket}
                  reload={reload}
                />
              ))}
            {!row.ticket && row.online_timing_mode !== "instant" && (
              <p className="text-xs leading-5 text-muted-foreground">
                Check-in creates the queue ticket. Call the patient and start service through the
                queue controls; clinical notes are a separate record.
              </p>
            )}
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}

function CareTicket({
  title,
  ticket,
  reload,
}: {
  title: string;
  ticket: Ticket;
  reload: () => void;
}) {
  const { can, href } = useWorkspace();
  return (
    <section className="grid gap-3 border-t border-border pt-5">
      <h3 className="font-semibold">{title}</h3>
      {can("queues.manage") ? (
        <QueueRow row={ticket} peers={[ticket]} reload={reload} compact />
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            <PersonIdentity
              kind="patient"
              name={ticket.patient ?? "Patient"}
              imageId={ticket.patient_portrait_id}
            />{" "}
            · Queue #{ticket.number}
          </span>
          <StatusBadge value={ticket.status} />
          {ticket.encounter_id && can("encounters.write") && !ticket.setup_blockers?.length && (
            <ButtonLink href={href(`/clinic/consultations/${ticket.encounter_id}`)}>
              Open consultation
            </ButtonLink>
          )}
        </div>
      )}
    </section>
  );
}
