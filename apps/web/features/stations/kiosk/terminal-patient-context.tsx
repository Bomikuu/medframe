"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import { PersonIdentity } from "@/components/application/person-identity";
import { Button } from "@/components/ui/button";
import type { PatientSession } from "./types";

export function terminalEntryLabel(session: PatientSession) {
  switch (session.entry_method) {
    case "terminal_identifier":
      return "Patient ID session";
    case "staff_terminal_selection":
      return "Selected by staff";
    case "verified_portal_link":
      return "Patient portal code";
    case "in_person_identity_verified":
    case "existing_clinic_identity_verified":
      return "Confirmed by reception";
    default:
      return "Patient terminal session";
  }
}

/** One patient context and clear action throughout the menu, review and confirmation. */
export function TerminalPatientContext({
  session,
  staff,
  busy,
  remaining,
  onFinish,
  showAction = true,
}: {
  session: PatientSession;
  staff: boolean;
  busy: boolean;
  remaining?: number;
  onFinish: () => void;
  showAction?: boolean;
}) {
  const Icon = staff ? ArrowLeftRight : LogOut;
  return (
    <section
      aria-label="Current terminal patient"
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 print:hidden"
    >
      <div className="min-w-0">
        <PersonIdentity kind="patient" name={session.patient_name} />
        <p className="mt-2 text-xs leading-5 break-words text-muted-foreground">
          {session.patient_reference && <span>{session.patient_reference} · </span>}
          {terminalEntryLabel(session)}
        </p>
      </div>
      {remaining !== undefined && (
        <p className="text-xs leading-5 text-muted-foreground">
          Clears after inactivity · {Math.floor(Math.max(0, remaining) / 60)}:
          {String(Math.max(0, remaining) % 60).padStart(2, "0")} left. Touch the screen to continue
          within your session limit.
        </p>
      )}
      {showAction && (
        <div className="grid gap-1.5 sm:text-right">
          <Button type="button" variant="outline" disabled={busy} onClick={onFinish}>
            <Icon aria-hidden />
            {staff ? "Change patient" : "Finish session"}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            {staff
              ? "Clears this patient; keeps staff mode open."
              : "Clears your details from this terminal."}
          </p>
        </div>
      )}
    </section>
  );
}
