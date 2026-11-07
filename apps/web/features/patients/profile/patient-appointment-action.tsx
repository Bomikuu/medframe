"use client";

import { PersonIdentity } from "@/components/application/person-identity";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/application/status-badge";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety } from "@/features/workspace/safety-provider";
import { useClinicTime } from "@/components/application/clinical-locale";
import { useOperationsSetup, useOperationsAction } from "@/features/operations/use-operations";
import { BookingForm } from "@/features/operations/booking-form";
import { OperationNotice } from "@/features/operations/controls";
import { appointmentPageSchema, type Appointment } from "@/features/operations/schema";
import { OperationAppointmentsDocument } from "@/lib/graphql/generated";
import { useRemote } from "../use-remote";
import { LoadState, RemoteNotice } from "../feedback";

export function PatientAppointmentAction({
  patient,
  branchId,
  mode,
  updated,
}: {
  patient: { id: string; name: string; reference: string };
  branchId: string;
  mode: "book" | "reschedule" | "check-in" | "walk-in";
  updated: () => void;
}) {
  const { organizationId } = useWorkspace();
  const { guard } = useSafety();
  const timeLabel = useClinicTime();
  const branch = branchId;
  const [after, setAfter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const setup = useOperationsSetup(branch);
  const action = useOperationsAction();
  const remote = useRemote(
    OperationAppointmentsDocument,
    {
      organizationId,
      filters: { branch_id: branch, patient_id: patient.id, status: "booked" },
      after,
    },
    { enabled: mode === "reschedule" || mode === "check-in" },
  );
  const parsed = appointmentPageSchema.safeParse(remote.data?.appointments);
  if (!setup.setup) return <LoadState error={setup.error} retry={setup.reload} />;
  return (
    <div className="grid min-w-0 gap-5">
      <OperationNotice message={action.message} error={action.error} />
      <RemoteNotice error={setup.error} retry={setup.reload} />
      {mode === "book" || mode === "walk-in" || selected ? (
        <BookingForm
          key={`${branch}:${selected?.id ?? mode}`}
          setup={setup.setup}
          patient={patient}
          walkIn={mode === "walk-in"}
          appointment={selected ?? undefined}
          reload={() => {
            remote.reload();
            updated();
          }}
        />
      ) : !parsed.success ? (
        <LoadState error={remote.error} retry={remote.reload} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Choose this patient’s appointment. Only booked appointments in the selected branch are
            shown.
          </p>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {!parsed.data.items.length && (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm">
              No booked appointments for this patient in this branch.
            </p>
          )}
          <div className="grid gap-3">
            {parsed.data.items.map((row) => (
              <div
                key={row.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{timeLabel(row.start)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <PersonIdentity kind="provider" name={row.provider} /> · {row.branch}
                  </p>
                  <span className="mt-2 inline-block">
                    <StatusBadge value={row.status} />
                  </span>
                </div>
                <Button
                  disabled={action.busy || row.patient_id !== patient.id}
                  onClick={() =>
                    mode === "reschedule"
                      ? setSelected(row)
                      : void action.run(
                          "check_in",
                          { id: row.id, expected_version: row.version },
                          () => {
                            remote.reload();
                            updated();
                          },
                        )
                  }
                >
                  {mode === "reschedule"
                    ? "Reschedule this appointment"
                    : "Check in this appointment"}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!after} onClick={() => setAfter(null)}>
              First appointments
            </Button>
            <Button
              variant="outline"
              disabled={!parsed.data.has_next_page}
              onClick={() => setAfter(parsed.data.end_cursor)}
            >
              More appointments
            </Button>
          </div>
        </>
      )}
      {selected && (
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => void guard(() => setSelected(null))}
        >
          Choose another appointment
        </Button>
      )}
    </div>
  );
}
