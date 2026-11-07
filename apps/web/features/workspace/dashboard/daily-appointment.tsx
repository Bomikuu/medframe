"use client";

import { useState } from "react";
import { AppointmentDetails } from "@/features/operations/appointment-details";
import { AppointmentEditorDialog } from "@/features/operations/appointment-editor-dialog";
import { BookingForm } from "@/features/operations/booking-form";
import { useOperationsSetup } from "@/features/operations/use-operations";
import { appointmentPageSchema } from "@/features/operations/schema";
import { useRemote } from "@/features/patients/use-remote";
import { OperationAppointmentsDocument } from "@/lib/graphql/generated";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadState } from "@/features/patients/feedback";
import { useWorkspace } from "../workspace-provider";
import { useSafety } from "../safety-provider";

export function DailyAppointment({
  id,
  patientId,
  day,
  close,
  updated,
}: {
  id: string;
  patientId: string;
  day: string;
  close: () => void;
  updated: () => void;
}) {
  const { organizationId, branchId } = useWorkspace();
  const { guard } = useSafety();
  const setup = useOperationsSetup();
  const [editing, setEditing] = useState(false);
  const remote = useRemote(
    OperationAppointmentsDocument,
    {
      organizationId,
      filters: {
        branch_id: branchId,
        patient_id: patientId,
        date: day,
        date_to: day,
        calendar: true,
        calendar_mode: "day",
      },
      after: null,
    },
    { refreshOnFocus: false },
  );
  const parsed = appointmentPageSchema.safeParse(remote.data?.appointments);
  const row = parsed.success ? parsed.data.items.find((item) => item.id === id) : null;
  const reload = () => {
    remote.reload();
    updated();
  };
  if (!setup.setup || !row)
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          <DialogTitle>Appointment</DialogTitle>
          <DialogDescription>
            Checking the current booking and your permitted actions.
          </DialogDescription>
          <LoadState
            error={
              setup.error ||
              remote.error ||
              (remote.data
                ? new Error(
                    "This appointment is unavailable. Open the calendar to review its latest details.",
                  )
                : null)
            }
            retry={() => {
              setup.reload();
              remote.reload();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  return editing ? (
    <AppointmentEditorDialog close={() => void guard(close)}>
      <BookingForm
        key={`${row.id}:${row.version}`}
        setup={setup.setup}
        appointment={row}
        reload={reload}
        complete={close}
        close={() => void guard(close)}
      />
    </AppointmentEditorDialog>
  ) : (
    <AppointmentDetails
      row={row}
      current={parsed.success ? (parsed.data.calendar?.in_service ?? []) : []}
      setup={setup.setup}
      reload={reload}
      close={close}
      reschedule={() => setEditing(true)}
      stale={remote.loading || !!remote.error}
      backLabel="Back to dashboard"
    />
  );
}
