"use client";

import { useState } from "react";
import { Check, Clock3, LogIn, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { callTime } from "./call-format";
import type { CallState } from "./client";

export function DoctorAdmission({
  state,
  busy,
  admit,
  remove,
}: {
  state: CallState;
  busy: boolean;
  admit: (id: string) => void;
  remove: (id: string) => Promise<boolean>;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const patient = state.patient_lobby;
  return (
    <section
      className="grid gap-3 rounded-xl border border-border bg-card p-4"
      aria-label="Patient admission"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 aria-hidden className="size-4 text-teal-ink" />
          {patient?.admitted ? "Patient admitted" : "Waiting room"}
        </h2>
        {patient?.admitted && (
          <span className="flex items-center gap-1.5 text-xs text-teal-ink">
            <Check aria-hidden className="size-4" />
            Access granted
          </span>
        )}
      </div>
      {!patient ? (
        <p className="text-xs leading-5 text-muted-foreground">
          No patient session has entered yet. The patient will appear here after entering the
          appointment PIN.
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium">{state.patient ?? "Scheduled patient"}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Entered at {callTime(patient.arrived_at, state.timezone)}
              {patient.last_seen_at
                ? ` · Last check-in ${callTime(patient.last_seen_at, state.timezone)}`
                : ""}
              . Arrival is a room session, not proof of real-world identity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["camera", "microphone", "speaker"] as const).map((kind) => (
              <span key={kind} className="rounded-md bg-muted px-2 py-1 text-xs capitalize">
                {kind}: {patient.device_checks[kind] ? "Reported checked" : "Not reported"}
              </span>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Device checks are patient-reported and optional. Admission unlocks call, chat and files;
            the appointment still needs to be started for live media.
          </p>
          {!patient.admitted && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => admit(patient.id)}>
                <LogIn aria-hidden className="size-4" />
                Admit patient
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmRemove(true)}>
                <UserX aria-hidden className="size-4" />
                Remove from waiting room
              </Button>
            </div>
          )}
        </>
      )}
      <Dialog
        open={confirmRemove}
        onOpenChange={(open) => {
          if (!busy) setConfirmRemove(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Remove this waiting session?</DialogTitle>
          <DialogDescription>
            This session will lose room access. The appointment and clinical records stay unchanged.
            The PIN is not changed; the patient can request entry again with it.
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !patient}
              onClick={async () => {
                if (patient && (await remove(patient.id))) setConfirmRemove(false);
              }}
            >
              Remove session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
